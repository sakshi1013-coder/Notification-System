/**
 * =========================================================
 * Notification System Simulation — script.js
 * =========================================================
 * Educational simulation of a real-world notification pipeline.
 * No backend. No frameworks. Pure Vanilla JS.
 *
 * Architecture flow:
 *   Client → API → Event Streaming → Processing → Push → Device → Storage
 * =========================================================
 */

'use strict';

/* ==========================================================
   STATE MANAGEMENT
   ========================================================== */

/** Central application state */
const AppState = {
  isRunning: false,          // simulation currently executing
  simCount: 0,               // total simulations run
  retryCount: 0,             // current retry attempts
  dlqCount: 0,               // messages in dead letter queue
  notifications: [],         // stored notifications (SQLite sim)
  redisCache: [],            // Redis cache entries
  nextId: 1,                 // auto-increment notification ID
  progressBar: null,         // reference to progress bar element

  /** Snapshot of control panel settings */
  currentSettings() {
    return {
      permission: document.getElementById('permissionSelect').value,
      network:    document.getElementById('networkSelect').value,
      phoneMode:  document.getElementById('phoneModeSelect').value,
      appState:   document.getElementById('appStateSelect').value,
      type:       document.getElementById('notifTypeSelect').value,
    };
  }
};

/* ==========================================================
   NOTIFICATION CONTENT TEMPLATES
   ========================================================== */

const NOTIF_TEMPLATES = {
  message: {
    tag: 'MSG',
    titles: ['New Message from Alice', 'John sent you a file', 'Team chat update'],
    bodies: ['Hey! Are you free today?', 'Project_v2.pdf shared', '5 new messages in #general'],
  },
  alert: {
    tag: 'ALERT',
    titles: ['Security Alert', 'Unusual Login Detected', 'System Warning'],
    bodies: ['Sign-in from new device', 'IP: 192.168.1.42 flagged', 'CPU usage exceeded 90%'],
  },
  reminder: {
    tag: 'REM',
    titles: ['Meeting in 15 minutes', 'Daily Standup', 'Deadline Tomorrow'],
    bodies: ['Sprint Review @ 3 PM', 'Don\'t forget to update tasks', 'Feature branch due tonight'],
  },
  update: {
    tag: 'UPD',
    titles: ['App Update Available', 'New Version 4.2.1', 'Critical Patch Ready'],
    bodies: ['Download to get bug fixes', 'Performance improvements', 'Security patch available'],
  },
  promo: {
    tag: 'PROMO',
    titles: ['Exclusive Deal for You!', '50% OFF Today Only', 'Your Reward is Waiting'],
    bodies: ['Use code NOTIFY50', 'Offer expires at midnight', 'Claim your 500 points'],
  },
};

/** Generate a notification payload */
function createPayload(type) {
  const tpl  = NOTIF_TEMPLATES[type] || NOTIF_TEMPLATES.message;
  const idx  = Math.floor(Math.random() * tpl.titles.length);
  const id   = `NTF-${String(AppState.nextId++).padStart(4, '0')}`;
  return {
    id,
    type,
    tag:   tpl.tag,
    title: tpl.titles[idx],
    body:  tpl.bodies[idx],
    user:  'user_42',
    ts:    new Date(),
  };
}

/* ==========================================================
   DOM HELPERS
   ========================================================== */

/** Get current formatted time string (HH:MM:SS) */
function timeStr() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

/** Append a log line to the console */
function log(message, type = 'info', icon = '●') {
  const body   = document.getElementById('consoleBody');
  const welcome = body.querySelector('.console-welcome');
  if (welcome) welcome.remove();

  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerHTML = `
    <span class="log-time">${timeStr()}</span>
    <span class="log-icon">${icon}</span>
    <span class="log-text">${message}</span>
  `;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
  return line;
}

/** Separator line in console */
function logSeparator() {
  const body = document.getElementById('consoleBody');
  const sep  = document.createElement('hr');
  sep.className = 'console-sep';
  body.appendChild(sep);
}

/** Promise-based delay */
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ==========================================================
   MODULE HIGHLIGHT HELPERS
   ========================================================== */

/** Highlight an architecture layer with a given state */
function highlightLayer(layerId, state = 'active') {
  const el = document.getElementById(`layer-${layerId}`);
  if (!el) return;
  el.classList.remove('active', 'success', 'error', 'warning');
  el.classList.add(state);
}

/** Highlight a specific module card */
function highlightModule(moduleId, state = 'active') {
  const el = document.getElementById(`mod-${moduleId}`);
  if (!el) return;
  el.classList.remove('active', 'success', 'error', 'warning');
  if (state) el.classList.add(state);
}

/** Clear all highlights */
function clearHighlights() {
  document.querySelectorAll('.arch-layer, .module-card').forEach(el => {
    el.classList.remove('active', 'success', 'error', 'warning');
  });
  document.querySelectorAll('.arch-arrow').forEach(el => {
    el.classList.remove('active');
    el.querySelector('.arrow-line')?.classList.remove('active');
  });
}

/** Animate an arrow (packet travels down) */
async function animateArrow(arrowId) {
  const arrow  = document.getElementById(arrowId);
  const line   = arrow?.querySelector('.arrow-line');
  const packet = arrow?.querySelector('.arrow-packet');
  if (!arrow || !line || !packet) return;

  arrow.classList.add('active');
  line.classList.add('active');
  packet.classList.remove('traveling');
  void packet.offsetWidth; // force reflow
  packet.classList.add('traveling');
  await wait(650);
  arrow.classList.remove('active');
  line.classList.remove('active');
  packet.classList.remove('traveling');
}

/* ==========================================================
   QUEUE VISUAL
   ========================================================== */

let queueDepth = 0;

/** Animate enqueueing into the notification queue */
async function enqueueVisual() {
  if (queueDepth >= 3) queueDepth = 0;
  const slot = document.getElementById(`qs${queueDepth + 1}`);
  if (slot) {
    slot.classList.add('filled');
    queueDepth++;
  }
}

/** Animate dequeueing from the notification queue */
async function dequeueVisual() {
  for (let i = 1; i <= 3; i++) {
    const slot = document.getElementById(`qs${i}`);
    if (slot?.classList.contains('filled')) {
      slot.classList.remove('filled');
      queueDepth = Math.max(0, queueDepth - 1);
      break;
    }
  }
}

/* ==========================================================
   RETRY / DLQ COUNTERS
   ========================================================== */

function updateRetryCounter(delta = 1) {
  AppState.retryCount += delta;
  const el = document.getElementById('retryCounter');
  if (el) el.textContent = AppState.retryCount;
}

function updateDLQCounter(delta = 1) {
  AppState.dlqCount += delta;
  const el = document.getElementById('dlqCounter');
  if (el) el.textContent = AppState.dlqCount;
}

/* ==========================================================
   PHONE ANIMATIONS
   ========================================================== */

/** Show notification popup on the phone mockup */
function showPhonePopup(payload, mode) {
  const popup = document.getElementById('phoneNotifPopup');
  const idle  = document.getElementById('phoneIdle');
  const title = document.getElementById('popupTitle');
  const body  = document.getElementById('popupBody');
  const label = document.getElementById('phoneModeLabel');
  const phone = document.getElementById('phoneMockup');
  const modeInd = document.getElementById('phoneModeIndicator');

  if (title) title.textContent = payload.title;
  if (body)  body.textContent  = payload.body;

  idle?.classList.add('hidden');
  popup?.classList.remove('hidden');

  // Mode-specific animations
  phone.classList.remove('vibrating');

  if (mode === 'normal') {
    if (label) label.textContent = 'Normal Mode — Bell Sound';
    if (modeInd) modeInd.textContent = 'Sound On';
    playBellAnimation();
  } else if (mode === 'silent') {
    if (label) label.textContent = 'Silent Mode — No Sound';
    if (modeInd) modeInd.textContent = 'Silent';
  } else if (mode === 'vibrate') {
    if (label) label.textContent = 'Vibrate Mode';
    if (modeInd) modeInd.textContent = 'Vibrating';
    phone.classList.add('vibrating');
    setTimeout(() => phone.classList.remove('vibrating'), 2500);
  } else if (mode === 'meeting') {
    if (label) label.textContent = 'Meeting Mode — Silent Popup';
    if (modeInd) modeInd.textContent = 'Meeting';
    showSilentOverlay();
  }

  // Auto-hide after 4 seconds
  setTimeout(() => {
    popup?.classList.add('hidden');
    idle?.classList.remove('hidden');
    if (modeInd) modeInd.textContent = '';
    if (label) label.textContent = `${capitalize(mode)} Mode`;
  }, 4000);
}

/** Animate bell icon above phone */
function playBellAnimation() {
  const bell = document.getElementById('bellContainer');
  if (!bell) return;
  bell.classList.remove('hidden');
  // Re-trigger animation by clone trick
  const newBell = bell.cloneNode(true);
  newBell.classList.remove('hidden');
  bell.parentNode.replaceChild(newBell, bell);
  setTimeout(() => {
    newBell.classList.add('hidden');
  }, 1500);
}

/** Show silent overlay for meeting mode */
function showSilentOverlay() {
  const screen = document.getElementById('phoneScreen');
  const existing = screen?.querySelector('.silent-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'silent-overlay';
  overlay.textContent = 'New notification (silent — no sound)';
  screen?.appendChild(overlay);
  setTimeout(() => overlay.remove(), 3000);
}

/** Reset phone to idle */
function resetPhone() {
  const popup = document.getElementById('phoneNotifPopup');
  const idle  = document.getElementById('phoneIdle');
  const label = document.getElementById('phoneModeLabel');
  const phone = document.getElementById('phoneMockup');
  popup?.classList.add('hidden');
  idle?.classList.remove('hidden');
  phone.classList.remove('vibrating');
  if (label) label.textContent = 'Waiting...';
}

/** Capitalize first letter */
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/* ==========================================================
   STORAGE SIMULATION (SQLite + Redis)
   ========================================================== */

/** Store a notification record in the visual SQLite table */
function storeInDB(payload, status) {
  const body = document.getElementById('storageTableBody');
  const empty = body?.querySelector('.empty-row');
  if (empty) empty.remove();

  // Animate DB module
  highlightModule('sqlite', 'active');
  setTimeout(() => highlightModule('sqlite', 'success'), 800);

  // Update visual db rows inside the left panel card
  const dbRows = document.getElementById('dbRows');
  if (dbRows) {
    const row = document.createElement('div');
    row.className = 'db-row';
    row.innerHTML = `<span>${payload.id}</span><span style="color:${status === 'delivered' ? 'var(--green-500)' : 'var(--red-500)'}">${status}</span>`;
    dbRows.appendChild(row);
    if (dbRows.children.length > 4) dbRows.removeChild(dbRows.children[1]);
  }

  // Add to in-memory store
  const record = {
    id:      payload.id,
    user:    payload.user,
    type:    payload.type,
    title:   payload.title,
    status,
    time:    payload.ts,
    ttl:     24 * 60 * 60, // 24 hours in seconds
    created: Date.now(),
  };
  AppState.notifications.push(record);
  document.getElementById('totalStored').textContent = `${AppState.notifications.length} stored`;

  // Insert row into the table
  const tr = document.createElement('tr');
  tr.id = `row-${record.id}`;
  tr.innerHTML = buildTableRow(record);
  body?.appendChild(tr);
  startTTLCountdown(record);
}

/** Store in Redis cache (visual) */
function storeInRedis(payload) {
  highlightModule('redis', 'active');
  setTimeout(() => highlightModule('redis', 'success'), 800);

  const slots = document.getElementById('redisSlots');
  const slot  = document.createElement('div');
  slot.className = 'redis-slot';
  slot.title = `${payload.id}: ${payload.title}`;
  slots?.appendChild(slot);

  const entry = { id: payload.id, slot, created: Date.now(), ttl: 24 * 60 * 60 };
  AppState.redisCache.push(entry);
  document.getElementById('totalCached').textContent = ` · ${AppState.redisCache.length} cached`;
}

/** Build a table row HTML string */
function buildTableRow(rec) {
  const statusClass = { delivered: 'delivered', failed: 'failed', retrying: 'retrying', dlq: 'dlq', blocked: 'blocked' }[rec.status] || 'delivered';
  const timeStr2 = rec.time.toLocaleTimeString();
  const tag      = NOTIF_TEMPLATES[rec.type]?.tag || 'MSG';
  const ttlPct   = 100; // starts full
  return `
    <td style="color:var(--text-accent)">${rec.id}</td>
    <td>${rec.user}</td>
    <td><span class="type-tag">${tag}</span></td>
    <td>${rec.title}</td>
    <td><span class="status-pill ${statusClass}">${rec.status}</span></td>
    <td style="color:var(--text-muted)">${timeStr2}</td>
    <td>
      <div class="ttl-bar">
        <div class="ttl-track"><div class="ttl-fill" id="ttl-${rec.id}" style="width:${ttlPct}%"></div></div>
        <span class="ttl-text" id="ttltext-${rec.id}">24h</span>
      </div>
    </td>
  `;
}

/** Countdown TTL visually (simulated: 24h = 24 seconds for demo) */
function startTTLCountdown(rec) {
  const DEMO_DURATION_MS = 24000; // 24 seconds represents 24 hours
  const start = Date.now();
  const fillEl = document.getElementById(`ttl-${rec.id}`);
  const textEl = document.getElementById(`ttltext-${rec.id}`);

  const interval = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.max(0, 100 - (elapsed / DEMO_DURATION_MS) * 100);
    const remaining = Math.max(0, Math.round(24 - (elapsed / DEMO_DURATION_MS) * 24));

    if (fillEl) fillEl.style.width = `${pct}%`;
    if (textEl) textEl.textContent = `${remaining}h`;

    // Mark redis slot as expired when TTL runs out
    if (pct <= 0) {
      clearInterval(interval);
      if (textEl) textEl.textContent = 'exp';
      if (fillEl) fillEl.style.background = 'var(--red-400)';
      const cEntry = AppState.redisCache.find(e => e.id === rec.id);
      if (cEntry?.slot) cEntry.slot.classList.add('expired');
    }
  }, 400);
}

/* ==========================================================
   CLEANUP SCHEDULER
   ========================================================== */

function runCleanup() {
  const now = Date.now();
  let removed = 0;

  AppState.redisCache = AppState.redisCache.filter(entry => {
    const age    = (now - entry.created) / 1000; // seconds
    const isStale = age > (24 * 60 * 60); // simulate: expired if older than 24 real hours
    // For demo purposes: also remove visually expired ones
    const isExpired = entry.slot?.classList.contains('expired');
    if (isExpired || isStale) {
      entry.slot?.remove();
      removed++;
      return false;
    }
    return true;
  });

  document.getElementById('totalCached').textContent = ` · ${AppState.redisCache.length} cached`;

  highlightModule('cleanup', 'active');
  setTimeout(() => highlightModule('cleanup', null), 1200);

  showToast(
    removed > 0 ? 'success' : 'info',
    'Cleanup Scheduler',
    removed > 0 ? `Removed ${removed} expired Redis cache entr${removed === 1 ? 'y' : 'ies'}.` : 'No expired entries found.'
  );
  log(`Cleanup Scheduler ran — ${removed} expired entr${removed === 1 ? 'y' : 'ies'} removed`, removed > 0 ? 'warning' : 'info', '~');
}

/* ==========================================================
   TOAST NOTIFICATIONS
   ========================================================== */

function showToast(type = 'info', title, body) {
  // SVG icons — no emojis
  const svgIcons = {
    success: `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="9 12 11 14 15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 12v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon toast-icon-${type}">${svgIcons[type] || svgIcons.info}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-body">${body}</div>
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

/* ==========================================================
   SYSTEM STATUS
   ========================================================== */

function setSystemStatus(text, type = 'default') {
  const badge = document.getElementById('systemStatus');
  if (!badge) return;
  badge.className = `status-badge ${type}`;
  badge.querySelector('span:last-child').textContent = text;
}

/* ==========================================================
   PROGRESS BAR
   ========================================================== */

function showProgressBar() {
  if (AppState.progressBar) return;
  const bar = document.createElement('div');
  bar.className = 'sim-running-overlay';
  document.body.prepend(bar);
  AppState.progressBar = bar;
}

function hideProgressBar() {
  AppState.progressBar?.remove();
  AppState.progressBar = null;
}

/* ==========================================================
   CORE SIMULATION PIPELINE
   ========================================================== */

/**
 * Run the full notification simulation.
 * Each step is asynchronous with a 0.7s delay for visual effect.
 *
 * @param {object} payload - Notification data created by createPayload()
 * @param {object} settings - Current UI settings (permission, network, etc.)
 */
async function runSimulation(payload, settings) {
  if (AppState.isRunning) return;

  AppState.isRunning = true;
  setBtn(false);
  clearHighlights();
  showProgressBar();
  logSeparator();
  setSystemStatus('Running...', 'warning');

  const STEP = 700; // ms between steps

  try {
    // ── STEP 1: Client Layer ──────────────────────────────
    highlightLayer('client', 'active');
    highlightModule('user', 'active');
    await wait(STEP / 2);
    log(`User triggered notification [${payload.id}] — type: ${payload.type}`, 'info', '▶');
    highlightModule('app', 'active');
    await wait(STEP);

    await animateArrow('arrow-client-api');

    // ── STEP 2: API Layer ─────────────────────────────────
    highlightLayer('api', 'active');
    highlightModule('gateway', 'active');
    log('API Gateway received the request', 'info', '→');
    await wait(STEP);

    highlightModule('auth', 'active');
    log('Authentication in progress...', 'info', '~');
    await wait(STEP);
    highlightModule('auth', 'success');
    log('Authentication successful — JWT verified', 'success', '✓');
    await wait(STEP);

    highlightModule('notifapi', 'active');
    log(`Notification API received payload: "${payload.title}"`, 'info', '→');
    await wait(STEP);
    highlightModule('notifapi', 'success');
    log('Notification saved to staging buffer', 'success', '✓');
    await wait(STEP);

    // ── Permission Check ──────────────────────────────────
    if (settings.permission === 'blocked') {
      highlightLayer('api', 'error');
      highlightModule('notifapi', 'error');
      log('Permission BLOCKED — User has denied notification permission', 'error', '✗');
      log('Simulation stopped at permission check', 'error', '✗');
      storeInDB(payload, 'blocked');
      storeInRedis(payload);
      showToast('error', 'Permission Blocked', 'Notification could not be delivered.');
      setSystemStatus('Blocked', 'error');
      showPhoneBlockedState();
      return;
    }
    highlightModule('permission', 'success');

    await animateArrow('arrow-api-stream');

    // ── STEP 3: Event Streaming ───────────────────────────
    highlightLayer('stream', 'active');
    highlightModule('publish', 'active');
    log('Notification Event published to message broker', 'info', '→');
    await wait(STEP);
    highlightModule('publish', 'success');

    highlightModule('queue', 'active');
    log('Event added to Notification Queue', 'info', '→');
    await enqueueVisual();
    await wait(STEP);
    highlightModule('queue', 'success');

    // ── Network Check → Retry / DLQ Logic ─────────────────
    if (settings.network === 'offline') {
      highlightLayer('stream', 'warning');
      log('Network is OFFLINE — cannot deliver', 'warning', '!');
      log('Waiting for network to become available...', 'warning', '~');
      await wait(STEP);

      let retries = 0;
      const MAX_RETRIES = 3;

      while (retries < MAX_RETRIES && settings.network === 'offline') {
        retries++;
        updateRetryCounter(1);
        highlightModule('retry', 'warning');
        log(`Retry attempt ${retries}/${MAX_RETRIES} — network still offline`, 'warning', '↺');
        await wait(STEP * 1.5);
        // Re-read network state in case user changed it
        settings.network = document.getElementById('networkSelect').value;
      }

      if (settings.network === 'offline') {
        // Still offline → Dead Letter Queue
        updateDLQCounter(1);
        highlightModule('retry', 'error');
        highlightModule('dlq', 'error');
        log(`Retry count exceeded (${MAX_RETRIES}) — moving to Dead Letter Queue`, 'error', '✗');
        log('Notification delivery permanently failed', 'error', '✗');
        storeInDB(payload, 'dlq');
        storeInRedis(payload);
        showToast('error', 'Dead Letter Queue', `Notification ${payload.id} sent to DLQ after ${MAX_RETRIES} retries.`);
        setSystemStatus('DLQ', 'error');
        return;
      }

      log('Network restored — resuming delivery...', 'success', '✓');
      updateRetryCounter(-1 * AppState.retryCount); // reset
      AppState.retryCount = 0;
    }

    await animateArrow('arrow-stream-proc');

    // ── STEP 4: Processing ────────────────────────────────
    highlightLayer('proc', 'active');
    highlightModule('worker', 'active');
    log('Notification Worker dequeuing event...', 'info', '→');
    await dequeueVisual();
    await wait(STEP);
    highlightModule('worker', 'success');

    highlightModule('decision', 'active');
    log('Delivery Decision Engine evaluating conditions...', 'info', '→');
    await wait(STEP);
    log(`   App State: ${settings.appState}  |  Phone Mode: ${settings.phoneMode}`, 'system', '▸');
    await wait(STEP / 2);
    highlightModule('decision', 'success');
    log('Decision: Deliver notification', 'success', '✓');
    await wait(STEP);

    await animateArrow('arrow-proc-push');

    // ── STEP 5: Push Delivery ─────────────────────────────
    highlightLayer('push', 'active');
    highlightModule('pushgw', 'active');
    log('Push Gateway routing notification...', 'info', '→');
    await wait(STEP);
    highlightModule('pushgw', 'success');

    highlightModule('firebase', 'active');
    log('Firebase / APNS processing push token...', 'info', '→');
    await wait(STEP);
    highlightModule('firebase', 'success');

    highlightModule('mobiledev', 'active');
    log('Dispatching to Mobile Device...', 'info', '→');
    await wait(STEP);
    highlightModule('mobiledev', 'success');

    await animateArrow('arrow-push-device');

    // ── STEP 6: User Device ───────────────────────────────
    highlightLayer('device', 'active');

    // App State log
    if (settings.appState === 'foreground') {
      log('App is in Foreground — in-app notification shown', 'info', '▸');
    } else if (settings.appState === 'background') {
      log('App is in Background — system notification displayed', 'info', '▸');
    } else {
      log('App is Hidden — system notification still delivered', 'info', '▸');
    }

    // Phone mode log
    const modeMessages = {
      normal:  'Normal Mode — sound + banner notification',
      silent:  'Silent Mode — notification shown without sound',
      vibrate: 'Vibrate Mode — device vibration triggered',
      meeting: 'Meeting Mode — silent popup only',
    };
    log(modeMessages[settings.phoneMode] || 'Delivering notification', 'info', '▸');

    highlightModule('permission', 'success');
    highlightModule('appstate',  'success');
    highlightModule('network',   'success');
    highlightModule('phonemode', 'active');
    await wait(STEP);
    highlightModule('phonemode', 'success');

    // Show phone popup
    showPhonePopup(payload, settings.phoneMode);

    log('Notification displayed on device', 'success', '✓');
    await wait(STEP);

    await animateArrow('arrow-device-storage');

    // ── STEP 7: Storage ───────────────────────────────────
    highlightLayer('storage', 'active');

    highlightModule('tokenstore', 'active');
    log('Device token updated in Token Store', 'info', '→');
    await wait(STEP / 2);
    highlightModule('tokenstore', 'success');

    highlightModule('sqlite', 'active');
    log('Storing notification in SQLite Database...', 'info', '→');
    await wait(STEP);
    storeInDB(payload, 'delivered');
    log(`Record inserted — ID: ${payload.id}`, 'success', '✓');
    await wait(STEP / 2);

    highlightModule('redis', 'active');
    log('Caching in Redis (TTL: 24 hours)...', 'info', '→');
    await wait(STEP);
    storeInRedis(payload);
    log('Cached in Redis — 24h TTL set', 'success', '✓');

    highlightLayer('storage', 'success');

    // Final
    logSeparator();
    log(`Simulation complete — ${payload.id} delivered successfully`, 'success', '★');
    setSystemStatus('Delivered', 'default');
    showToast('success', 'Notification Delivered', `${payload.title} — ${payload.id}`);

    // Increment counter
    AppState.simCount++;
    document.getElementById('simCount').textContent = AppState.simCount;

  } catch (err) {
    log(`Unexpected error: ${err.message}`, 'error', '✗');
    console.error('[SimError]', err);
  } finally {
    AppState.isRunning = false;
    setBtn(true);
    hideProgressBar();
  }
}

/** Show phone in blocked state */
function showPhoneBlockedState() {
  const idle  = document.getElementById('phoneIdle');
  const popup = document.getElementById('phoneNotifPopup');
  const label = document.getElementById('phoneModeLabel');

  popup?.classList.add('hidden');
  if (idle) {
    idle.innerHTML = `
      <svg class="phone-idle-icon-svg" viewBox="0 0 24 24" fill="none" width="32" height="32" style="color:#dc2626">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="8" y1="15" x2="16" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div class="phone-idle-text" style="color:var(--red-500)">Permission Blocked</div>`;
    idle.classList.remove('hidden');
  }
  if (label) label.textContent = 'Permission Denied';

  setTimeout(() => {
    if (idle) {
      idle.innerHTML = `
        <svg class="phone-idle-icon-svg" viewBox="0 0 24 24" fill="none" width="32" height="32">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div class="phone-idle-text">Waiting...</div>`;
    }
    if (label) label.textContent = 'Waiting...';
  }, 4000);
}

/* ==========================================================
   BUTTON STATE
   ========================================================== */

function setBtn(enabled) {
  const runBtn    = document.getElementById('runSimBtn');
  const createBtn = document.getElementById('createNotifBtn');
  if (runBtn)    runBtn.disabled    = !enabled;
  if (createBtn) createBtn.disabled = !enabled;
}

/* ==========================================================
   CREATE NOTIFICATION (without running full simulation)
   ========================================================== */

let pendingPayload = null;

function handleCreateNotification() {
  const settings = AppState.currentSettings();
  pendingPayload  = createPayload(settings.type);

  log(`Notification created: [${pendingPayload.id}] "${pendingPayload.title}"`, 'system', '+');
  log(`   Type: ${settings.type} | Permission: ${settings.permission} | Network: ${settings.network}`, 'system', '▸');
  showToast('info', 'Notification Created', `"${pendingPayload.title}" — click Run Simulation to deliver.`);
}

/* ==========================================================
   RESET
   ========================================================== */

function handleReset() {
  clearHighlights();
  resetPhone();
  pendingPayload = null;

  // Clear console
  const body = document.getElementById('consoleBody');
  if (body) {
    body.innerHTML = `
      <div class="console-welcome">
        <div class="welcome-icon-svg">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="welcome-text">
          <strong>System Reset</strong>
          <span>All cleared. Configure settings and run a new simulation.</span>
        </div>
      </div>
    `;
  }

  // Clear storage table
  const tbody = document.getElementById('storageTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No notifications yet. Run a simulation to see data.</td></tr>';
  }

  // Clear redis slots
  const redisSlots = document.getElementById('redisSlots');
  if (redisSlots) redisSlots.innerHTML = '';

  // Clear db rows
  const dbRows = document.getElementById('dbRows');
  if (dbRows) {
    dbRows.innerHTML = '<div class="db-row-header"><span>ID</span><span>Status</span></div>';
  }

  // Reset counters
  AppState.notifications = [];
  AppState.redisCache    = [];
  AppState.retryCount    = 0;
  AppState.dlqCount      = 0;
  queueDepth             = 0;

  document.getElementById('retryCounter').textContent = '0';
  document.getElementById('dlqCounter').textContent   = '0';
  document.getElementById('totalStored').textContent  = '0 stored';
  document.getElementById('totalCached').textContent  = ' · 0 cached';

  // Reset queue slots
  ['qs1','qs2','qs3'].forEach(id => document.getElementById(id)?.classList.remove('filled'));

  setSystemStatus('System Ready');
  showToast('info', 'Reset Complete', 'All simulation data cleared.');
}

/* ==========================================================
   CONSOLE CLEAR
   ========================================================== */

function handleConsoleClear() {
  const body = document.getElementById('consoleBody');
  if (body) body.innerHTML = '';
  log('Console cleared', 'system', '○');
}

/* ==========================================================
   LIVE SETTING LABELS (phone mode label sync)
   ========================================================== */

function syncPhoneModeLabel() {
  const mode  = document.getElementById('phoneModeSelect').value;
  const label = document.getElementById('phoneModeLabel');
  const modeLabels = {
    normal:  'Normal Mode',
    silent:  'Silent Mode',
    vibrate: 'Vibrate Mode',
    meeting: 'Meeting Mode',
  };
  if (label) label.textContent = modeLabels[mode] || mode;
}

/* ==========================================================
   BOOT — AMBIENT ANIMATIONS
   ========================================================== */

/**
 * Randomly highlight modules to simulate background activity,
 * giving the architecture diagram a "live system" feel.
 */
function startAmbientActivity() {
  const modules = [
    'user', 'app', 'gateway', 'auth', 'notifapi',
    'publish', 'queue', 'worker', 'decision',
    'pushgw', 'firebase', 'sqlite', 'redis', 'tokenstore'
  ];

  setInterval(() => {
    if (AppState.isRunning) return;

    // Pick a random module and briefly activate it
    const mod = modules[Math.floor(Math.random() * modules.length)];
    const el  = document.getElementById(`mod-${mod}`);
    if (!el) return;

    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 600 + Math.random() * 800);
  }, 2200);
}

/* ==========================================================
   INIT — EVENT LISTENERS
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Run Simulation button
  document.getElementById('runSimBtn')?.addEventListener('click', () => {
    const settings = AppState.currentSettings();
    const payload  = pendingPayload || createPayload(settings.type);
    pendingPayload  = null;
    runSimulation(payload, settings);
  });

  // Create Notification button
  document.getElementById('createNotifBtn')?.addEventListener('click', handleCreateNotification);

  // Reset button
  document.getElementById('resetBtn')?.addEventListener('click', handleReset);

  // Console clear button
  document.getElementById('consoleClearBtn')?.addEventListener('click', handleConsoleClear);

  // Cleanup Scheduler button (inside storage card)
  document.getElementById('cleanupBtn')?.addEventListener('click', runCleanup);

  // Phone mode label sync
  document.getElementById('phoneModeSelect')?.addEventListener('change', syncPhoneModeLabel);

  // Start ambient animations
  startAmbientActivity();

  // Boot log
  log('Notification System Simulation initialized', 'system', '>');
  log('Configure settings above and click Run Simulation', 'system', '▸');
  log('Version 1.0.0 — Educational Simulation', 'system', '▸');

  console.log('%c[NotifSim] Ready', 'color:#2563eb;font-weight:bold;font-size:14px;');
});
