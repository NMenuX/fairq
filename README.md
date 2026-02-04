# FairQ - Fairness-Aware Bank Queue Management System

FairQ is an intelligent bank queue management system that prioritizes fairness. It uses a Dynamic Weighted Fair Queuing (DWFQ) algorithm to suggest the next customer to be served, balancing individual wait times and vulnerability status across different service categories.

## Project Architecture

The system consists of a centralized FastAPI backend and three specialized React frontends:

- **`backend/`**: FastAPI application handling business logic, database management (SQLite/PostgreSQL), and the fairness algorithm.
- **`frontend-user/`**: **Kiosk Dashboard** where customers can generate tokens and view their current position in the queue.
- **`frontend-counter/`**: **Staff Counter Dashboard** where bank tellers can see the queue, receive AI-driven suggestions for the next customer, and manage calls.
- **`frontend-management/`**: **Admin Dashboard** for system administrators to monitor real-time metrics, analytics, and manage system settings.

## Getting Started

### Prerequisites

- Docker and Docker Compose (recommended)
- OR Node.js 18+ and Python 3.10+ (for manual setup)

### Using Docker (Quickest)

To run the entire system with one command:

```bash
docker-compose up --build
```

Access the services at:
- **Backend API**: http://localhost:8000 (Docs at /docs)
- **User Kiosk**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5174
- **Counter Dashboard**: http://localhost:5175

### Manual Setup

#### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e .
# Set environment variables in .env
python app/main.py
```

#### 2. Frontends (Repeat for each folder)

```bash
cd frontend-user  # or frontend-counter, frontend-management
npm install
npm run dev
```

## Key Features

- **DWFQ Algorithm**: Prevents "starvation" of lower-priority customers while still honoring vulnerability status (elderly, disabled, etc.).
- **Real-time Synchronization**: Frontend dashboards update instantly via the API.
- **Fairness Metrics**: Built-in analytics to monitor the "Fairness Ratio" across different customer segments.
- **Developer-Friendly**: Fully containerized and includes verification scripts for the core algorithms.

## Core Algorithm Verification

To verify the fairness algorithm logic, run:

```bash
cd backend
python verify_algo.py
```

---
*Built with FastAPI, React, and Vite.*
