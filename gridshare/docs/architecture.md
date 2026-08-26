# GridShare System Architecture

GridShare is a decentralized, AI-driven peer-to-peer (P2P) community microgrid energy routing and optimization platform.

```
+-----------------------------------------------------------+
|               HARDWARE & SIMULATOR LAYER                  |
|  - 2 x ESP32 (INA219 Voltage/Current Sensors, OLED, Load) |
|  - Python Telemetry Simulator (Diurnal Generation/Demand) |
+-----------------------------+-----------------------------+
                              |
                     [HTTP POST / MQTT]
                              |
                              v
+-----------------------------------------------------------+
|                   FLASK REST API BACKEND                  |
|  - Telemetry Ingestion & Real-Time Aggregator             |
|  - Flask-SQLAlchemy ORM + PostgreSQL / SQLite             |
|  - Automated P2P Order Matching & Battery Rule Engine     |
+----------------------+--------------+---------------------+
                       |              |
                       v              v
+------------------------------+ +--------------------------+
|  MACHINE LEARNING (RF MODEL) | |     REACT DASHBOARD      |
|  - 6-Hour Horizon Forecasts  | | - Real-time telemetry    |
|  - Demand / Solar Inference  | | - Interactive P2P Ledger |
|  - Peak-Shaving Triggers     | | - Dynamic Micro-charts   |
+------------------------------+ +--------------------------+
```

## Core Modules
1. **Frontend (`gridshare/frontend`)**: React + Vite + Tailwind CSS + Recharts + React Router.
2. **Backend (`gridshare/backend`)**: Modular Flask API with service-layer architecture.
3. **Database (`gridshare/database`)**: PostgreSQL/SQLite schema with deterministic seeders.
4. **Simulator (`gridshare/simulator`)**: High-fidelity community energy telemetry generator.
5. **Machine Learning (`gridshare/ml`)**: Random Forest time-series regression.
