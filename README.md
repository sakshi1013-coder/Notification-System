# Notification Management System

A full-stack educational project combining a **Python backend** (Producer–Consumer architecture, SQLite, multithreading) with an **interactive browser-based simulation dashboard** (HTML · CSS · Vanilla JS) that visualises the complete notification pipeline in real time.

> **GitHub Repository:** https://github.com/sakshi1013-coder/Notification-System.git

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Simulation Dashboard](#simulation-dashboard)
4. [Project Structure](#project-structure)
5. [Dependencies](#dependencies)
6. [Setup Instructions](#setup-instructions)
7. [Execution Steps](#execution-steps)
8. [Notification Flow](#notification-flow)
9. [System Modules](#system-modules)
10. [Database Design](#database-design)
11. [Features](#features)
12. [Future Enhancements](#future-enhancements)
13. [Author](#author)

---

## Project Overview

This project simulates a **real-world notification management system** in two complementary layers:

| Layer | Technology | Description |
|---|---|---|
| Backend Engine | Python (Jupyter Notebook) | Producer–Consumer pipeline with SQLite persistence and multithreaded delivery |
| Simulation UI | HTML + CSS + Vanilla JS | Interactive architecture dashboard with animated flow, live console, and storage visualisation |

**Key concepts demonstrated:**

- Producer–Consumer Design Pattern
- Queue-based asynchronous notification processing
- Multithreading with background worker threads
- SQLite database integration and status tracking
- Redis cache simulation with TTL countdown
- Retry queue and Dead Letter Queue (DLQ) logic
- Permission, network, and phone-mode conditional delivery
- Modular, clean code with no external frameworks

---

## Architecture

The system follows a layered **Producer–Consumer Architecture**:

```
Client Layer
     │
     ▼
API Layer
     │  (API Gateway → Authentication → Notification API)
     ▼
Event Streaming
     │  (Publish Event → Notification Queue)
     ▼
Notification Processing
     │  (Worker → Decision Engine → Retry Queue → Dead Letter Queue)
     ▼
Push Delivery
     │  (Push Gateway → Firebase / APNS → Mobile Device)
     ▼
User Device
     │  (Permission · App State · Network · Phone Mode)
     ▼
Storage Layer
     │  (SQLite Database · Redis Cache · Cleanup Scheduler · Device Token Store)
```

---

## Simulation Dashboard

The browser-based dashboard (`index.html`) provides:

- **Left panel** — all 7 architecture layers rendered as connected cards with animated data-packet arrows
- **Right panel** — live simulation console with colour-coded logs, a phone mockup with mode-specific animations, and a storage table with TTL countdowns
- **Top controls** — dropdowns for Permission, Network, Phone Mode, App State, and Notification Type

### Simulation Cases

| Case | Condition | Behaviour |
|---|---|---|
| 1 | Permission = Blocked | Stops at API layer; stores as `blocked` |
| 2 | Network = Offline | Enters retry loop (max 3 attempts) then Dead Letter Queue |
| 3 | Phone = Normal | Bell animation + sound indicator |
| 4 | Phone = Silent | Notification displayed, no sound |
| 5 | Phone = Vibrate | Phone-shake + ripple ring animations |
| 6 | Phone = Meeting | Silent overlay popup |
| 7 | App = Hidden / Background | System notification still delivered |

---

## Project Structure

```
Notification-System/
│
├── index.html          # Simulation dashboard — full architecture UI
├── style.css           # Light theme — Inter/JetBrains Mono, clean shadows
├── script.js           # Simulation engine — state machine, all 7 cases
│
├── code.ipynb          # Python backend — Producer-Consumer implementation
├── notification.db     # SQLite database (auto-created by notebook)
│
└── README.md           # Project documentation
```

---

## Dependencies

### Simulation Dashboard (Frontend)

No dependencies. Opens directly in any modern browser.

```
index.html   — pure HTML5
style.css    — pure CSS3 (no frameworks)
script.js    — pure Vanilla JS (no libraries)
```

External fonts loaded via Google Fonts CDN (requires internet):

```
Inter         — UI typography
JetBrains Mono — console / monospace
```

### Python Backend (Notebook)

Uses **Python's built-in standard library only** — no `pip install` required.

```python
import sqlite3    # Persistent notification storage
import threading  # Background worker thread
import queue      # FIFO notification queue
import uuid       # Unique notification IDs
import time       # Processing delays
from datetime import datetime  # Timestamps
```

**Python version:** 3.8 or higher recommended.

---

## Setup Instructions

### Option A — Run the Simulation Dashboard (no Python needed)

1. Clone the repository:
   ```bash
   git clone https://github.com/sakshi1013-coder/Notification-System.git
   cd Notification-System
   ```

2. Open `index.html` in any modern browser:
   ```bash
   open index.html          # macOS
   start index.html         # Windows
   xdg-open index.html      # Linux
   ```

3. No server, no build step, no installation required.

---

### Option B — Run the Python Backend

1. Clone the repository (if not already done):
   ```bash
   git clone https://github.com/sakshi1013-coder/Notification-System.git
   cd Notification-System
   ```

2. Ensure Python 3.8+ is installed:
   ```bash
   python3 --version
   ```

3. Launch Jupyter Notebook:
   ```bash
   jupyter notebook code.ipynb
   ```
   > If Jupyter is not installed: `pip install jupyter`

4. Proceed to [Execution Steps](#execution-steps).

---

## Execution Steps

### Simulation Dashboard

| Step | Action |
|---|---|
| 1 | Open `index.html` in a browser |
| 2 | Set **Permission**, **Network**, **Phone Mode**, **App State**, and **Type** using the dropdowns |
| 3 | Click **Create Notification** to stage a payload (optional) |
| 4 | Click **Run Simulation** to animate the full pipeline |
| 5 | Watch the console logs appear every ~0.7 s with colour-coded status |
| 6 | Observe the phone mockup animate based on the selected mode |
| 7 | Check the **Storage Table** for the inserted record and TTL countdown |
| 8 | Click **Run Cleanup** inside the Cleanup Scheduler card to expire Redis entries |
| 9 | Click **Reset** to clear all state and start fresh |

### Python Backend (Notebook)

| Step | Action |
|---|---|
| 1 | Open `code.ipynb` in Jupyter |
| 2 | Run all cells sequentially (Kernel → Restart & Run All) |
| 3 | The system auto-creates the SQLite database and notification table |
| 4 | The worker thread starts and begins consuming the queue |
| 5 | Submit notification requests using the provided functions |
| 6 | The processor routes requests through Email, SMS, or Push channel |
| 7 | Check the notification history table at the end of the notebook |

---

## Notification Flow

```
User
  │
  ▼
Notification Server (Producer)
  │   Validates input, generates UUID, stores in SQLite
  ▼
Notification Queue (FIFO)
  │   Decouples producer from consumer
  ▼
Notification Processor (Consumer — Worker Thread)
  │   Fetches from queue, routes by channel
  ▼
Channel Router
  ├── Email Service    → Simulates SMTP delivery
  ├── SMS Service      → Simulates carrier delivery
  └── Push Service     → Simulates FCM/APNS delivery
         │
         ▼
Logger + Database Update
  │   Updates status to DELIVERED / FAILED
  ▼
Notification History
```

---

## System Modules

### 1. Notification Server (Producer)

- Accepts user notification requests
- Generates a unique `notification_id` via `uuid`
- Validates username, message, and channel
- Persists record to SQLite with status `PENDING`
- Pushes the notification object into the FIFO queue

### 2. Validator

Validates all incoming requests:

| Field | Rule |
|---|---|
| Username | Non-empty string |
| Message | Non-empty string |
| Channel | Must be `email`, `sms`, or `push` |

### 3. SQLite Database

Stores all notification records persistently.

**Table:** `notifications`

| Column | Type | Description |
|---|---|---|
| `notification_id` | TEXT | UUID primary key |
| `username` | TEXT | Recipient identifier |
| `channel` | TEXT | email / sms / push |
| `message` | TEXT | Notification content |
| `status` | TEXT | PENDING / DELIVERED / FAILED |
| `created_at` | TEXT | ISO 8601 timestamp |

### 4. Notification Queue

- Python `queue.Queue()` — thread-safe FIFO
- Decouples the producer (server) from the consumer (processor)
- Prevents notification loss during high load

### 5. Notification Processor (Consumer)

- Runs on a **background daemon thread**
- Continuously polls the queue with `queue.get()`
- Calls the Channel Router for delivery
- Updates the database status after each attempt
- Records structured logs for every event

### 6. Channel Router

Routes each notification to the correct service based on `channel`:

```python
if channel == "email":  EmailService.send(...)
if channel == "sms":    SMSService.send(...)
if channel == "push":   PushService.send(...)
```

### 7. Services (Email / SMS / Push)

Each service simulates delivery with a processing delay and returns a success/failure result. Designed to be replaced with real integrations (SMTP, Twilio, Firebase) in production.

### 8. Logger

Maintains a structured event log:

- Notification received
- Validation result
- Queue enqueue / dequeue
- Channel delivery result
- Database status update

---

## Database Design

```sql
CREATE TABLE IF NOT EXISTS notifications (
    notification_id TEXT PRIMARY KEY,
    username        TEXT NOT NULL,
    channel         TEXT NOT NULL,
    message         TEXT NOT NULL,
    status          TEXT DEFAULT 'PENDING',
    created_at      TEXT NOT NULL
);
```

---

## Features

- [x] Producer–Consumer Architecture
- [x] Thread-safe FIFO queue
- [x] Background worker thread
- [x] SQLite database with status tracking
- [x] Email, SMS, and Push channel simulation
- [x] Notification history display
- [x] Structured logging
- [x] Interactive architecture simulation dashboard
- [x] Animated 7-layer system pipeline
- [x] Live console with colour-coded logs
- [x] Phone mockup with mode-specific animations (Normal / Silent / Vibrate / Meeting)
- [x] Retry queue + Dead Letter Queue simulation
- [x] Redis cache TTL countdown
- [x] Cleanup Scheduler for expired cache entries
- [x] Light theme — no frameworks, pure HTML/CSS/JS

---

## Future Enhancements

- SMTP integration for real email delivery (smtplib / SendGrid)
- Twilio API integration for real SMS delivery
- Firebase Cloud Messaging for real push notifications
- REST API layer using Flask or FastAPI
- JWT-based user authentication
- Priority queue (VIP notifications)
- Notification rate limiting and throttling
- Real-time WebSocket console
- Dark / light theme toggle in the dashboard
- Persistent notification history across page reloads (localStorage)

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Python 3 | Backend notification engine |
| SQLite | Persistent notification storage |
| `queue.Queue` | Thread-safe FIFO notification queue |
| `threading` | Background consumer worker |
| `uuid` | Unique notification IDs |
| HTML5 | Simulation dashboard structure |
| CSS3 | Light theme, animations, glassmorphism cards |
| Vanilla JavaScript | Simulation state machine, pipeline logic |
| Google Fonts (CDN) | Inter + JetBrains Mono typography |

---

## Author

**Sakshi Shingole**

System Design — Final Examination Project (2nd Semester)

**GitHub Repository:** https://github.com/sakshi1013-coder/Notification-System.git