# ⚡ GridShare — AI-Driven Decentralized Community Microgrid
### Schneider Electric Yuva Yodha 2026 — Challenge 03: Grid Reliability & Renewable Intermittency

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Node: 18+](https://img.shields.io/badge/node-18%2B-blue.svg)](https://nodejs.org)
[![Python: 3.12](https://img.shields.io/badge/python-3.12-amber.svg)](https://www.python.org)
[![Test Suite](https://img.shields.io/badge/tests-81%2F81%20passing-success.svg)]()
[![Production Build](https://img.shields.io/badge/vite%20build-passing-success.svg)]()

GridShare is a **decentralized peer-to-peer (P2P) community microgrid platform** engineered to solve **low-voltage feeder reliability, renewable intermittency, and peak transformer overloading**. It integrates a trained **Random Forest demand forecasting ensemble**, a **physical feeder simulation engine** (LinDistFlow voltage & energy conservation), and **multi-interval predictive storage and flexible-load coordination**.

---

## 🎯 Challenge 03: Problem & Target Users

### The Problem: Renewable Intermittency on Low-Voltage Feeders
As residential rooftop solar PV adoption surges, distribution substations face two destabilizing extremes:
1. **Midday Reverse Power Surges**: Solar generation exceeds household loads, causing reverse power flow, local bus overvoltage ($>1.05\text{ p.u.}$), and inverter tripping.
2. **Evening Shortfall & Steep Ramp (The Duck Curve)**: When solar generation collapses at sunset, simultaneous residential EV charging, cooling/heating, and cooking create an unmitigated evening demand spike, overloading distribution transformers and incurring costly peak utility tariffs.

### Target Users & Stakeholders
* **Distribution System Operators (DSOs / DISCOMs)**: Need transformer ampacity protection, voltage compliance, and non-wire alternatives to expensive substation transformer upgrades.
* **Community Microgrid Operators & Housing Societies**: Require shared energy storage system (ESS) management, autonomous demand response, and fair allocation.
* **Prosumers & Consumers**: Prosumers want higher value for solar surplus than low feed-in tariffs; consumers want cheaper green electricity without sacrificing essential appliance availability.

---

## 🔬 How GridShare Addresses Renewable Intermittency

1. **Empirical ML Demand & Diurnal Solar Forecasts**: Uses a 100-tree `RandomForestRegressor` with ensemble tree variance ($\sigma$) to predict 1h–24h feeder demand and shortfalls ahead of time.
2. **Predictive Community ESS Arbitrage**: Automatically charges community battery storage during midday solar surplus and discharges during peak TOU windows ($18\text{h}00$–$22\text{h}00$), preserving a strict $20\%$ critical emergency reserve floor.
3. **Headroom-Constrained Demand Shifting**: Deferrable flexible loads (EV charging, laundry) are coordinated and shifted from evening deficit windows into midday solar surplus hours without double-allocating solar headroom.
4. **Guaranteed Essential Base-Load Safeguard**: Base critical loads (lighting, refrigeration, medical equipment) are strictly non-curtailable. In severe capacity-constrained emergencies, only flexible loads are shed.
5. **Exact Physical Feeder Simulation (LinDistFlow)**: Enforces real-world transformer kVA limits, low-voltage line impedances, voltage drop/rise bounds ($0.95$–$1.05\text{ p.u.}$), and exact energy conservation ($\sum \text{sources} = \sum \text{sinks}$ to $< 10^{-6}\text{ kW}$).

---

## 🏛️ System Architecture & Actual Data Flow

```
[ Historical Data & Profiles ]
              │
              ▼
[ RandomForestRegressor (100 Trees) ] ──► [ Demand Forecast (kW) ± Empirical Tree Std Dev (σ) ]
[ Diurnal Solar Geometry Model ]      ──► [ Renewable Solar Forecast (kW) ]
                                                            │
                                                            ▼
                                          [ Feeder Forecast Optimizer ]
                                          ├── Detects Deficit & Shortfall Windows
                                          ├── Enforces Battery Reserve Floor (>=20%) & C-Rates
                                          ├── Shifts Flexible Loads into Verified Solar Headroom
                                          └── Optimizes Time-of-Use (TOU) Tariff Arbitrage
                                                            │
                                                            ▼
                                          [ Physical Feeder Simulation Engine ]
                                          ├── LinDistFlow Voltage Approximation (V_pu)
                                          ├── Transformer Ampacity & Loading Ceiling (50 kVA)
                                          ├── Battery Chemical Storage & Efficiency Losses (90.25%)
                                          └── Energy Balance Conservation (Sources == Sinks)
                                                            │
                                                            ▼
                                          [ Flask REST Endpoints (/api/feeder/*) ]
                                                            │
                                                            ▼
                                          [ Grid Reliability Dashboard (/grid) ]
                                          ├── Feeder Overview KPIs (Usable Energy, Unmet Demand)
                                          ├── Multi-Series Recharts (Solar, Demand, Import, SOC)
                                          ├── Feasible Action Panel (Battery & DR Recommendations)
                                          ├── Scenario Physics Sliders (Solar, Demand, SOC, Floor)
                                          └── Reproducible Benchmark Suite (6 Test Scenarios)
```

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
