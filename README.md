# GridShare — AI-Driven Decentralized Community Microgrid

GridShare is a decentralized, peer-to-peer (P2P) community energy sharing and optimization platform. It combines real-time smart-meter telemetry, Random Forest machine learning for solar and load forecasting, and an automated rule engine for energy routing and battery storage management.

---

## 🏗️ Monorepo Architecture

```
gridshare/
├── frontend/             # React + Vite + Tailwind CSS + Recharts Dashboard
├── backend/              # Flask REST API + Service Layer + SQLAlchemy ORM
├── ml/                   # Random Forest Load & Solar Forecasting Models
├── simulator/            # Diurnal Smart Meter Telemetry Generator & Publisher
├── database/             # PostgreSQL / SQLite Schemas & Deterministic Seeders
└── docs/                 # System Architecture & API Specifications
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ and npm

### 2. Environment Setup
```bash
# Clone and enter the workspace
cd d:\grid-ai

# Activate Python Virtual Environment
.\venv\Scripts\activate

# Install Frontend Dependencies
cd gridshare\frontend
npm install
cd ..\..
```

### 3. Initialize and Seed Database
```bash
python -m gridshare.database.init_db
```
*Seeds reproducible deterministic data for 5 community households, community battery (40% SOC), and PPT presentation scenario.*

### 4. Run API Test Suite
```bash
python -m unittest gridshare.backend.tests.test_api
```

### 5. Start Backend Server (Port 5000)
```bash
python -m gridshare.backend.run
```
- Health Check: `http://localhost:5000/api/health`
- Live Energy API: `http://localhost:5000/api/energy/live`
- Dashboard API: `http://localhost:5000/api/dashboard/summary`

### 6. Start Frontend Dashboard (Port 5173)
In a new terminal:
```bash
cd gridshare\frontend
npm run dev
```
Open: `http://localhost:5173`

### 7. Run Telemetry Simulator (Background Data Feed)
In a new terminal:
```bash
# Continuous live telemetry (every 3 seconds)
python -m gridshare.simulator.run_simulator --mode live --interval 3.0

# Or inject deterministic PPT demo state
python -m gridshare.simulator.run_simulator --mode ppt
```

---

## 📊 Presentation Demo Preset Scenario
- **House A (Solar Champion)**: Generation = `6.8 kW`, Consumption = `2.1 kW` (Surplus = `+4.7 kW`)
- **House B (Heavy EV Home)**: Generation = `1.2 kW`, Consumption = `4.0 kW` (Deficit = `-2.8 kW`)
- **Community Battery**: `40.0% SOC` (Capacity: `50.0 kWh`)
- **Grid Benchmark**: `₹6.10/kWh`
- **P2P Matched Clearing Rate**: `₹4.50/kWh` (Saves ₹1.60/kWh compared to utility grid)
- **Source Attribute**: All synthetic records tagged with `source="SIMULATED"`.
