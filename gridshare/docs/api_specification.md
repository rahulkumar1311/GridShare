# GridShare REST API Specification

Base URL: `http://localhost:5000/api`

## Endpoints

### 1. Health
- `GET /health`
  - Returns database and service status.

### 2. Households
- `GET /households`
  - Returns all registered microgrid households.
- `GET /households/:id`
  - Returns detail of specific household.

### 3. Energy Telemetry
- `GET /energy/live`
  - Returns latest generation, consumption, and net balance across all households.
- `GET /energy/history?household_id=house_a&hours=24`
  - Returns time-series readings.
- `GET /energy/summary`
  - Returns aggregated community metrics (total gen, total con, net balance).

### 4. Community Battery
- `GET /battery`
  - Returns community battery state of charge (SOC), capacity, and reserve.
- `PATCH /battery`
  - Updates SOC or reserve threshold.

### 5. Prediction
- `GET /predictions?household_id=house_a`
  - Returns forecast predictions.
- `POST /predictions/run`
  - Triggers ML prediction generation pipeline.

### 6. Optimization & Rules
- `POST /optimization/run`
  - Executes GridShare rule engine to match P2P orders and battery charge/discharge.
- `GET /optimization/latest`
  - Returns audit log of routing decisions.

### 7. Trading
- `GET /trades`
  - Returns P2P transaction history.
- `POST /trades/match`
  - Triggers matching engine.

### 8. Dashboard
- `GET /dashboard/summary`
  - Consolidated payload for React frontend dashboard.

### 9. Telemetry Ingestion
- `POST /telemetry`
  - Ingests single telemetry packet (`household_id`, `generation_kw`, `consumption_kw`, `battery_soc`, etc.).
