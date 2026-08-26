# GridShare Database Layer

This directory manages the database schema, models, initialization, and reproducible deterministic seeders for GridShare.

## Supported Databases
1. **PostgreSQL** (Production / Hackathon Server)
2. **SQLite** (Local Zero-Config Development & Fallback)

---

## 1. Core Schema Entities

| Entity | Table Name | Purpose | Key Attributes |
|---|---|---|---|
| **Household** | `households` | Prosumer/Consumer nodes | `id`, `name`, `location`, `household_type`, `created_at` |
| **EnergyReading** | `energy_readings` | Real-time & time-series telemetry | `id`, `household_id`, `timestamp`, `generation_kw`, `consumption_kw`, `battery_soc`, `grid_price`, `source` |
| **Battery** | `batteries` | Community energy storage system | `id`, `community_id`, `capacity_kwh`, `current_soc`, `min_reserve`, `updated_at` |
| **EnergyTransaction** | `energy_transactions` | P2P trading ledger | `id`, `seller_household_id`, `buyer_household_id`, `energy_kwh`, `price_per_kwh`, `total_value`, `status`, `timestamp` |
| **Prediction** | `predictions` | ML load/solar forecasts | `id`, `household_id`, `prediction_time`, `predicted_demand_kw`, `predicted_generation_kw`, `confidence`, `model_version` |
| **OptimizationDecision**| `optimization_decisions` | GridShare rule engine audit | `id`, `timestamp`, `source_household`, `target`, `energy_kwh`, `action`, `reason` |

---

## 2. Configuration (`.env`)

To connect to a local or cloud PostgreSQL instance, update `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/gridshare_db
```
*If not set or if PostgreSQL is offline, the backend automatically uses `sqlite:///gridshare.db` for instant execution.*

---

## 3. How to Initialize and Seed

From the project root:

```bash
# Activate virtual environment
.\venv\Scripts\activate

# Run database table creation and deterministic seeding
python -m gridshare.database.init_db
```

### Deterministic Seed Data (PPT Demo Scenario)
- **House A**: Generation = `6.8 kW`, Consumption = `2.1 kW`, Surplus = `+4.7 kW` (8 kW Solar Prosumer)
- **House B**: Generation = `1.2 kW`, Consumption = `4.0 kW`, Deficit = `-2.8 kW` (EV/Heavy Consumer)
- **House C**: Generation = `3.5 kW`, Consumption = `2.2 kW`, Surplus = `+1.3 kW`
- **House D**: Generation = `0.0 kW`, Consumption = `1.8 kW`, Deficit = `-1.8 kW`
- **House E**: Generation = `5.2 kW`, Consumption = `2.0 kW`, Surplus = `+3.2 kW`
- **Community Battery**: Capacity = `50.0 kWh`, SOC = `40.0%`, Min Reserve = `20.0%`
- **Grid Benchmark Tariff**: `₹6.10/kWh`
- **P2P Matched Tariff**: `₹4.50/kWh`
- **Telemetry Tag**: `source = "SIMULATED"`
