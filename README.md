# 🔔 Notification Management System

A lightweight, multi-threaded notification management system built using **Python**, **SQLite**, and the **Producer–Consumer Design Pattern**. The system demonstrates asynchronous notification processing, queue management, multithreading, and channel-based notification delivery through Email, SMS, and Push Notifications.

---

# 🏗️ Architecture Overview

The system follows the **Producer–Consumer Architecture**.

```
                User
                  │
                  ▼
        Notification Server
                  │
                  ▼
            Validator
                  │
                  ▼
             SQLite Database
                  │
                  ▼
        Notification Queue
                  │
                  ▼
      Notification Processor
                  │
                  ▼
          Channel Router
        ┌──────┼──────┐
        ▼      ▼      ▼
     Email    SMS    Push
        │      │      │
        └──────┼──────┘
               ▼
            Logger
```

---

# 🚀 Project Overview

This project simulates a real-world notification system where users submit notification requests. Every request is validated, stored in a database, placed inside a queue, processed asynchronously, and finally delivered through the selected notification channel.

The project demonstrates:

- Producer–Consumer Design Pattern
- Queue-based Notification Processing
- Multithreading
- SQLite Database Integration
- Notification Status Tracking
- Logging Mechanism
- Modular System Design

---

# ⚙️ System Modules

## 1. Notification Server (Producer)

- Accepts notification requests
- Generates unique Notification IDs
- Invokes Validator
- Stores notifications in SQLite
- Pushes notifications into the queue

---

## 2. Validator

Responsible for validating:

- Username
- Notification Message
- Notification Channel

Supported channels:

- Email
- SMS
- Push Notification

---

## 3. SQLite Database

Stores notification information.

Table: **notifications**

Fields:

- Notification ID
- Username
- Channel
- Message
- Status
- Created Timestamp

---

## 4. Notification Queue

Uses Python's FIFO Queue.

Responsibilities:

- Holds pending notifications
- Synchronizes Producer and Consumer
- Prevents request loss

---

## 5. Notification Processor (Consumer)

Continuously monitors the queue.

Responsibilities:

- Fetch notification
- Route notification
- Update delivery status
- Record logs

Runs in a background worker thread.

---

## 6. Channel Router

Routes notifications based on the selected communication channel.

Supported Channels:

- Email Service
- SMS Service
- Push Notification Service

---

## 7. Notification Services

### 📧 Email Service

Simulates email delivery.

### 📱 SMS Service

Simulates SMS delivery.

### 🔔 Push Notification Service

Simulates push notification delivery.

---

## 8. Logger

Maintains system logs for:

- Notification received
- Notification processed
- Notification delivered
- Status updated

---

# 💾 Database Design

**Database:** SQLite

Table:

```
notifications
```

| Field | Type |
|---------|------|
| notification_id | TEXT |
| username | TEXT |
| channel | TEXT |
| message | TEXT |
| status | TEXT |
| created_at | TEXT |

---

# 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| Python | Backend Logic |
| SQLite | Database |
| HTML | Simulation Interface |
| CSS | Styling |
| Queue | Notification Queue |
| Threading | Background Processing |

---

# 📂 Project Structure

```
Notification-System/
│
├── code.ipynb
├── notification.db
├── index.html
├── style.css
├── README.md
```

---

# 📦 Dependencies

The project uses Python's built-in libraries.

```python
sqlite3
threading
queue
uuid
time
datetime
```

No external packages are required.

---

# ▶️ Execution Steps

### Step 1

Clone the repository.

```bash
git clone https://github.com/yourusername/Notification-System.git
```

---

### Step 2

Open the project folder.

---

### Step 3

Launch the notebook.

```
code.ipynb
```

---

### Step 4

Run all notebook cells sequentially.

---

### Step 5

The system automatically:

- Creates SQLite database
- Creates Notification Queue
- Starts Worker Thread
- Accepts Notification Requests
- Routes Notifications
- Updates Database
- Displays Notification History

---

# 🔄 Notification Flow

```
User
   │
   ▼
Notification Server
   │
   ▼
Validator
   │
   ▼
Database
   │
   ▼
Notification Queue
   │
   ▼
Notification Processor
   │
   ▼
Channel Router
   │
 ┌─┼──────────────┐
 ▼ ▼              ▼
Email SMS       Push
   │
   ▼
Logger
   │
   ▼
Database Updated
```

---

# 📈 Features

✅ Producer–Consumer Architecture

✅ Queue-based Processing

✅ Multithreading

✅ SQLite Database

✅ Email Simulation

✅ SMS Simulation

✅ Push Notification Simulation

✅ Notification History

✅ Logging

---

# 🔮 Future Enhancements

- SMTP Email Integration
- Twilio SMS Integration
- Firebase Push Notifications
- REST API using Flask/FastAPI
- User Authentication
- Retry Mechanism
- Priority Queue
- Notification Dashboard

---

# 👩‍💻 Author

**Sakshi Shingole**

System Design Final Examination Project

Github Repo Link - https://github.com/sakshi1013-coder/Notification-System.git

Notification Management System using Producer–Consumer Architecture