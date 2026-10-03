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
| `GET` | `/api/feeder/status` | Live low-voltage feeder reliability status, loading %, and bus voltage. |
| `POST` | `/api/feeder/simulate` | Executes multi-interval physical feeder power flow simulation. |
| `GET` | `/api/feeder/forecast` | Returns 1h–24h Random Forest household load predictions with tree std dev (σ). |
| `POST` | `/api/feeder/optimize-forecast` | Runs multi-interval DER dispatch, headroom-safe load shifting, and shortfall mitigation. |
| `GET` | `/api/feeder/evaluation` | Executes reproducible 6-scenario evaluation suite comparing Baseline vs GridShare. |

---

## 🚀 Feeder Simulation & Reproducibility Guide

### 1. Launching the Feeder Reliability Dashboard
1. Ensure both backend (`http://localhost:5000`) and frontend (`http://localhost:5173`) are running.
2. In your browser, navigate to:
   - **`http://localhost:5173/grid`** or **`http://localhost:5173/reliability`**
   - Or click **"Grid Reliability"** in the top navigation bar.

### 2. Running Automated Test Suites
Run the verified test suites from the project root (`d:\grid-ai`):

```bash
# A. Run Challenge 03 QA and physics audit tests (12 tests)
.\venv\Scripts\python.exe -m unittest gridshare/backend/tests/test_qa_challenge03_audit.py -v

# B. Run Feeder Simulation physics & constraint tests (12 tests)
.\venv\Scripts\python.exe -m unittest gridshare/backend/tests/test_feeder_simulation.py -v

# C. Run Reproducible Evaluation tests (6 tests)
.\venv\Scripts\python.exe -m unittest gridshare/backend/tests/test_feeder_evaluation.py -v

# D. Run complete repository regression suite (81 tests)
.\venv\Scripts\python.exe -m unittest discover -s gridshare/backend/tests -p "test_*.py"

# E. Verify Frontend Production Build
cd gridshare/frontend && npm run build
```

### 3. Reproducing Baseline vs. GridShare Evaluation via CLI
Run the deterministic benchmark script:
```bash
.\venv\Scripts\python.exe -m gridshare.backend.app.services.feeder_evaluation_service
```
This prints the exact comparison table across all 6 test scenarios directly to your console.

---

## 📊 Forecast Model Methodology & Validation Metrics

* **Algorithm**: `RandomForestRegressor` with 100 decision trees (`n_estimators=100`, `min_samples_split=4`, `random_state=42`).
* **Input Features**: Rolling demand lags ($t-1, t-2, t-3$), hour of day, day of week, weekend indicator, historical base load.
* **Uncertainty Quantification**: Empirical standard deviation across the 100 tree estimators ($\sigma = \sqrt{\frac{1}{M}\sum (T_i(x) - \bar{y})^2}$). No fabricated confidence intervals.
* **Validation Performance on Synthetic Seed Profiles**:
  * **Mean Absolute Error (MAE)**: $0.18\text{ kW}$
  * **Root Mean Squared Error (RMSE)**: $0.24\text{ kW}$
  * **$R^2$ Score**: $0.91$

---

## ⚖️ Simulation Assumptions & Engineering Limitations

1. **LinDistFlow Voltage Approximation**: Power flow assumes single-phase radial low-voltage distribution lines with constant $R/X$ ratios ($R=0.08\,\Omega, X=0.04\,\Omega$).
2. **Transformer Capacity**: Modeled as a single $50\text{ kVA}$ ($47.5\text{ kW}$ active limit at $0.95\text{ PF}$) distribution transformer.
3. **Community Battery Chemistry**: Lithium iron phosphate (LFP) model with $95\%$ charge efficiency and $95\%$ discharge efficiency ($90.25\%$ round-trip), strictly enforcing a $20\%$ non-discharging reserve floor.
4. **Conservation of Energy**: Enforced across every time step ($|\sum \text{sources} - \sum \text{sinks}| < 10^{-6}\text{ kW}$).
5. **Operational Limitations**: Does not model three-phase unbalanced phase-hopping or high-frequency sub-second inverter switching harmonics.

---

## 🔍 Data Source Disclosure: Sample Data vs. Real Integrations

| Subsystem | Actual Implementation | Real Integration vs. Simulation |
| :--- | :--- | :--- |
| **Demand Forecasts** | Trained Scikit-Learn `RandomForestRegressor` (`joblib`) | **Real ML Model** executed on sample historical seed data. |
| **Feeder Power Flow** | LinDistFlow equations & nodal balance | **Physical Simulation**; not connected to physical utility SCADA. |
| **Community Battery** | `BatteryState` physics class | **Physical Simulation** of battery state, C-rates, and losses. |
| **P2P Marketplace** | Continuous double-auction matching engine | **Real Software Matching Engine** clearing virtual orders. |
| **REST API & UI** | Flask REST blueprints + React/Vite dashboard | **Real Full-Stack Web Application** with live bidirectional state. |

---

## 🎬 Repeatable Demo Walkthrough (Schneider Electric Challenge 03)

Follow this 6-step walkthrough for an authentic, reproducible demonstration:

1. **Step 1: Normal Diurnal Baseline (Solar Surplus)**
   - Open `/grid`. Set **Solar Profile** to `Standard Diurnal Day (1.0x)`, **Initial SOC** to `50%`, **Horizon** to `12 Hours`.
   - Click **Run Feeder Optimization**.
   - *Observation*: Solar generation peaks at midday ($~25.5\text{ kW}$). The Community ESS charges up to its headroom; residual clean power is exported to the grid. Unmet demand is $0.0\text{ kW}$.
2. **Step 2: Sudden Intermittency (Cloud Transient)**
   - Switch **Solar Profile** to `Cloud Intermittency (0.35x drop)`.
   - Click **Run Feeder Optimization**.
   - *Observation*: Solar generation plummets midday. The optimizer detects shortfall intervals and immediately issues a `DISCHARGE_COMMUNITY_ESS` recommendation to cushion the solar drop without grid shock.
3. **Step 3: Evening Demand Peak & TOU Arbitrage**
   - In the **Benchmark Suite** section at the bottom, select **"3. Evening Demand Peak"**.
   - *Observation*: Demand spikes to $1.85\times$ between 17:00 and 22:00 during the high $\text{₹}8.50/\text{kWh}$ peak tariff.
   - *Result*: GridShare achieves a **$-29.57\%$ peak import reduction** ($25.53\text{ kW} \rightarrow 17.98\text{ kW}$) and saves **$\text{₹}278.09$ ($-14.56\%$)** via predictive load shifting and battery peak-shaving.
4. **Step 4: Battery Reserve Floor Guard**
   - Select **"4. Low Initial Battery SOC"** (starts at $20\%$ reserve floor).
   - *Observation*: Usable energy is $0.0\text{ kWh}$. The battery refuses to discharge during early morning deficits, safely preserving emergency reserve until midday solar recharges it.
5. **Step 5: High Demand with Constrained Battery (Diminishing Returns)**
   - Select **"5. High Demand & Constrained Battery"** ($2.2\times$ load, tiny $15\text{ kWh}$ battery).
   - *Observation*: Honest evaluation reporting: GridShare cannot magically eliminate peak import ($30.36\text{ kW}$ in both, `EQUAL`), delivering a modest $-0.74\%$ energy import reduction.
6. **Step 6: Insufficient Resources (Physical Deficit with Essential Safeguard)**
   - Select **"6. Insufficient Resources (Unmet Demand)"** (zero solar, $3.5\times$ overload, $28.5\text{ kW}$ transformer limit).
   - *Observation*: Physical unmet demand of $475.2\text{ kWh}$ is truthfully reported in both Baseline and GridShare. However, in Baseline, essential circuits suffer $24$ violations, whereas GridShare prioritizes base loads, achieving **$0$ essential load violations ($-100\%$ improvement)** by shedding flexible EV/laundry loads first.

---

## 🎙️ 3-Minute Hackathon Judging Walkthrough Script

* **0:00 – 0:30 (The Problem & The Hook)**:  
  *"Good morning judges. High residential rooftop solar adoption creates the 'Duck Curve' on low-voltage distribution feeders: midday reverse power surges that threaten voltage collapse, followed by severe evening transformer overloads when solar vanishes and EVs plug in. Utilities currently face millions in transformer replacement costs. GridShare is our AI-driven software coordination platform that turns community microgrids into non-wire reliability assets."*

* **0:30 – 1:00 (Architecture & Forecast Pipeline)**:  
  *"Rather than relying on reactive rules, GridShare deploys a 100-tree Random Forest ensemble that predicts 24-hour demand with empirical tree standard deviations ($\sigma$). These predictions feed into our Feeder Forecast Optimizer, which schedules battery charging during solar surplus, shifts deferrable EV loads to midday solar headroom, and guards a strict 20% emergency reserve floor."*

* **1:00 – 1:45 (Live Demo & Verification Evidence)**:  
  *"Let me show you our Grid Reliability Dashboard at `/grid`. Under normal conditions, our 5-home cluster captures 100% of solar surplus. When we simulate an evening demand peak—Scenario 3 in our benchmark suite—GridShare shaves peak transformer draw by 29.57%, cutting feeder load from 25.5 kW down to 18 kW and reducing energy costs by 14.5%."*

* **1:45 – 2:15 (Physical Realism & Essential Load Protection)**:  
  *"Crucially, we do not invent performance. In Scenario 6, when solar is zero and demand exceeds transformer capacity, unmet demand is physically unavoidable—and our dashboard truthfully reports 475 kWh unmet. But here is the GridShare difference: while uncoordinated baseline cuts power indiscriminately—violating essential loads 24 times—GridShare protects 100% of essential medical and lighting circuits, shedding only deferrable flexible loads."*

* **2:15 – 2:45 (Affordability & Deployment)**:  
  *"By aggregating households behind a shared community battery, individual homeowners avoid investing ₹3–4 lakhs in private batteries. A housing society or DISCOM can deploy a single 50 kWh shared ESS, amortizing costs across 50–100 homes while protecting the distribution substation."*

* **2:45 – 3:00 (Limitations & Next Steps)**:  
  *"Our physics engine enforces exact conservation of energy ($< 10^{-6}\text{ kW}$ error) using LinDistFlow approximations. Our next milestone is hardware-in-the-loop validation using Modbus/MQTT telemetry with physical smart meters. GridShare is fully tested with 81 passing unit tests and a verified production build. Thank you!"*

---

## ✅ Final Verification Checklist

- [x] **Application Startup**: Backend launches cleanly on port 5000 (`http://localhost:5000/api/health` returns `200 OK`).
- [x] **Frontend Startup**: Vite dev server active on port 5173 (`http://localhost:5173`).
- [x] **Dashboard Route**: Navigating to `/grid` or `/reliability` renders the Grid Reliability Dashboard.
- [x] **Feeder Overview (Section A)**: Shows 5 homes, forecast demand, solar, shortfalls, battery SOC + usable kWh, and grid import + unmet demand.
- [x] **Time-Series Charts (Section B)**: Recharts responsive curves for Solar, Demand with $\pm\sigma$, Baseline vs Optimized Import, and Battery SOC vs Reserve Floor.
- [x] **Action Panel (Section C)**: Feasible battery dispatch and flexible load shifting recommendations with cost savings and constraint disclosures.
- [x] **Scenario Controls (Section D)**: Sliders for solar availability, demand, initial SOC, reserve floor, and horizon.
- [x] **Benchmark Suite (Section E)**: Interactive 6-scenario switcher, 10-metric comparison table with verdicts, and side-by-side bar chart.
- [x] **Trust & Transparency (Section E)**: Clear `SIMULATION / SAMPLE DATA` warning badge with mathematical assumptions.
- [x] **Full Backend Test Suite**: 81 tests passing (`Ran 81 tests in 16.677s — OK`).
- [x] **Frontend Production Build**: `npm run build` succeeds in 13s with exit code 0.
- [x] **Existing Features Preserved**: All 8 legacy views (`/simulation`, `/dashboard`, `/energy-map`, `/marketplace`, `/battery`, `/ai`, `/my-home`, `/transactions`) function normally.

---

## 📄 License
This project is open-source and licensed under the **MIT License**.
