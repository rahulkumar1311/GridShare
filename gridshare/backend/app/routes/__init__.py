from .health_routes import health_bp
from .household_routes import household_bp
from .energy_routes import energy_bp
from .battery_routes import battery_bp
from .prediction_routes import prediction_bp
from .optimization_routes import optimization_bp
from .trading_routes import trading_bp
from .dashboard_routes import dashboard_bp
from .telemetry_routes import telemetry_bp
from .market_routes import market_bp
from .demo_routes import demo_bp

__all__ = [
    "health_bp",
    "household_bp",
    "energy_bp",
    "battery_bp",
    "prediction_bp",
    "optimization_bp",
    "trading_bp",
    "dashboard_bp",
    "telemetry_bp",
    "market_bp",
    "demo_bp",
]
