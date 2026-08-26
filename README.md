# ⚡ GridShare — AI-Driven Decentralized Community Microgrid

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Node: 18+](https://img.shields.io/badge/node-18%2B-blue.svg)](https://nodejs.org)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-amber.svg)](https://www.python.org)
[![Build Status](https://img.shields.io/badge/tests-26%2F26%20passing-success.svg)]()

GridShare is a state-of-the-art **decentralized peer-to-peer (P2P) community energy trading, battery optimization, and digital twin platform**. It empowers residential neighborhoods to maximize local renewable solar utilization, eliminate peak grid charges, and equitably share community energy storage through automated AI forecasting and continuous double-auction market clearing.

---

## 🌟 Key Features & Modules

### 1. 🏠 "My Home" 3D Residential Digital Twin (`/my-home`)
- **Interactive Cutaway Residence**: Realistic 3D house with rooftop PV solar panels, wall-mounted battery ESS, entrance smart meter, EV carport, and live appliance switches.
- **5 Smart Operating Modes**: `AUTO (OPTIMAL)`, `SELF USE`, `BATTERY FIRST`, `SELL SURPLUS`, `GRID BACKUP`.
- **Appliance Load Management**: Real-time switches for Air Conditioner, Refrigerator, Television, Kitchen Appliances, and Washing Machine with dynamic wattage recalculation.
- **Battery Reserve Guard**: Visual SOC gauge, manual charge/discharge controls, and strict reserve protection slider (e.g. 20% emergency floor).
- **Explainable Energy Score**: 0–100 efficiency score factoring solar self-consumption, battery health, and peak-hour avoidance.
- **24-Hour Diurnal Timeline Simulator**: Play/pause/scrub through full day/night solar generation and load curves.

### 2. 🌐 Interactive 3D Microgrid Topology (`/simulation` & `/energy-map`)
- **Spatial Node Network**: Realistic 3D spatial mapping of Prosumers (House A, C), Consumers (House B, D, E), Community Battery Storage, and the Utility Substation.
- **Glowing Particle Flow Conduits**: High-visibility animated particle conduits indicating real-time bilateral power transfers (Solar surplus ➔ Battery / P2P, Grid import fallback).

### 3. 🛒 Real-Time P2P Energy Marketplace (`/marketplace`)
- **Continuous Double-Auction Engine**: Instant matching of prosumer sell offers and consumer buy bids with fair clearing prices (e.g. ₹4.50/kWh).
- **Prosumer & Consumer Controls**: One-click listing of sellable rooftop solar surplus and instant green energy sourcing.
- **Trade Confirmation Modal**: 6-stage trade lifecycle with transparent wallet payment settlement (debit buyer / credit seller).

### 4. 🔋 Community Battery ESS & Ownership (`/battery`)
- **Fair Virtual Ownership Model**: Tracks proportional kilowatt-hour contributions from each household with equity credit shares.
- **Interactive Battery Digital Twin**: 3D battery rack visualizer with temperature, degradation rate, cycle counter, and reserve floor guards.
- **Automated Storage vs. Grid Decision Engine**: Evaluates whether to store surplus for evening peak avoidance or export to the utility grid.

### 5. 🧠 AI Forecasts & Functional Recommendations (`/ai`)
- **Random Forest ML Ensemble**: 24-hour diurnal solar generation and household load forecasting based on Global Horizontal Irradiance (GHI) and historical profiles.
- **Actionable AI Recommendations**:
  - 🔋 **Charge ESS Battery**: Captures midday solar surplus before high evening tariffs.
  - 🤝 **Sell Surplus P2P**: Lists energy on the P2P marketplace for peer arbitrage.
  - ⚡ **Discharge Battery**: Peak shaves demand to avoid utility grid charges.
  - 🛒 **Buy P2P Green Energy**: Direct peer sourcing when battery reaches reserve floor.
- **Real-Time State Mutations**: Clicking **`[ APPLY RECOMMENDATION ]`** immediately executes backend API actions, updates battery SOC, re-balances the grid, and logs audit entries.

### 6. 🧾 P2P Energy Transaction Ledger (`/transactions`)
- **Transparent Transaction Audit**: Formatted transaction records (`#TXN-2026-001`) showing timestamps, sellers, buyers, kWh volume, unit tariff, and total INR.
- **Transaction Inspection**: 6-stage verification lifecycle, physical energy routing path, and bilateral wallet settlements.
- **Seller & Buyer Summaries**: Clear breakdown of solar sales earnings and consumer tariff savings vs. utility DISCOM rates.
- **Search, Multi-Type Filters & CSV Export**: Download verifiable `.csv` ledger reports directly in the browser.

### 7. 🎛️ Multi-Objective Energy Optimizer (`/optimize`)
- **5 Optimization Strategies**: `MIN_COST`, `MAX_RENEWABLES`, `MIN_GRID`, `MAX_BATTERY`, `BALANCED`.
- **Constraint Solver**: Enforces physical line capacities, minimum battery reserves, and maximum grid feed-in limits.

---

## 🏗️ Monorepo Architecture

```
gridshare/
├── frontend/             # React 18 + Vite + Tailwind CSS + Three.js / R3F + Lucide Icons + Recharts
│   ├── src/
│   │   ├── components/
│   │   │   ├── home-3d/       # Residential cutaway 3D house digital twin
│   │   │   ├── energy-map-3d/ # Microgrid spatial scene, sub-stations, and flow lines
│   │   │   ├── battery/       # Battery ESS 3D rack & ownership components
│   │   │   ├── marketplace/   # P2P order book, trade modals, and manual order forms
│   │   │   ├── ledger/        # Transaction table, detail modal, 2.5D topology graph
│   │   │   └── home/          # Energy modes, appliance manager, timeline simulator
│   │   ├── pages/             # Route views (MyHome, Dashboard, Market, Battery, AI, Ledger, Optimizer)
│   │   └── services/          # Axios API clients, market matching engine, simulation state
├── backend/              # Flask REST API + SQLAlchemy ORM + Service Layer
│   ├── app/
│   │   ├── models/            # Household, EnergyTransaction, BatteryStorage, Telemetry models
│   │   ├── routes/            # Energy, Battery, Market, Optimization, AI, and Demo blueprints
│   │   └── services/          # Battery accounting, double-auction matcher, storage optimizer
│   └── tests/                 # Unit and integration test suite (26 passing tests)
├── ml/                   # Machine learning training pipelines & Random Forest models
├── simulator/            # Diurnal telemetry generator & background publisher
└── database/             # Database initialization scripts and deterministic seeders
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: 18.x or higher
- **Python**: 3.10 or higher
- **Git**

### 2. Clone & Setup Environment
```bash
# Clone the repository
git clone https://github.com/rahulkumar1311/grids.git
cd grids

# Setup Python Virtual Environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install Frontend Dependencies
cd gridshare/frontend
npm install
cd ../..
```

### 3. Initialize & Seed Database
```bash
python -m gridshare.database.init_db
```
*Populates deterministic demo data for 5 community households, community battery (40% SOC), and live market orders.*

### 4. Run API Unit Test Suite
```bash
python -m unittest gridshare.backend.tests.test_api
```

### 5. Start Backend Server (Port 5000)
```bash
python -m gridshare.backend.run
```
- **Health Check**: `http://localhost:5000/api/health`
- **Dashboard API**: `http://localhost:5000/api/dashboard/summary`
- **Battery Ledger**: `http://localhost:5000/api/battery/ledger`

### 6. Start Frontend Development Server (Port 5173)
In a separate terminal:
```bash
cd gridshare/frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📡 REST API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health and cluster connectivity status. |
| `GET` | `/api/energy/live` | Real-time aggregate generation, demand, and net grid balance. |
| `GET` | `/api/dashboard/summary` | Complete microgrid overview metrics, nodes, and battery SOC. |
| `GET` | `/api/battery` | Battery state, total stored kWh, SOC, and reserve settings. |
| `POST` | `/api/battery/contribute` | Ingests prosumer surplus into community battery storage. |
| `POST` | `/api/battery/withdraw` | Discharges stored energy to supply household load. |
| `GET` | `/api/battery/ledger` | Audit trail of all storage contribution and withdrawal events. |
| `GET` | `/api/market/orders` | Active P2P buy bids and sell offers in order book. |
| `POST` | `/api/market/offers` | Submits a prosumer surplus sell offer. |
| `POST` | `/api/market/requests` | Submits a consumer energy buy request. |
| `POST` | `/api/market/match` | Runs continuous double-auction clearing and matching. |
| `GET` | `/api/market/transactions` | Verified P2P energy trades and settlement records. |
| `POST` | `/api/optimize` | Runs multi-objective constraint optimization solver. |
| `POST` | `/api/demo/ppt-scenario` | Injects deterministic hackathon presentation demo state. |

---

## 🎯 Benchmark Economic & Tariff Model

| Parameter | Utility Grid Standard | GridShare P2P Network | Prosumer / Consumer Benefit |
| :--- | :--- | :--- | :--- |
| **Grid Import Tariff** | ₹6.10 / kWh | — | Baseline utility retail rate. |
| **Grid Export Feed-in** | ₹3.50 / kWh | — | Low DISCOM compensation. |
| **P2P Matched Tariff** | — | **₹4.50 / kWh** | **Prosumer earns +₹1.00/kWh more** vs export. |
| **Consumer Savings** | — | **₹4.50 / kWh** | **Consumer saves ₹1.60/kWh** vs grid import. |
| **Community ESS Dividend** | — | **Virtual Credits** | Fair ownership proportional to kWh contributed. |

---

## 📄 License
This project is open-source and licensed under the **MIT License**.
