import os
from gridshare.backend.app import create_app
from gridshare.backend.app.config import Config
from gridshare.database.seed_data import seed_database
from gridshare.backend.app.models import db

app = create_app(Config)

def setup_app():
    with app.app_context():
        # Ensure database tables are created
        db.create_all()
        # Seed initial demo data if empty
        seed_database(clear_existing=False)

if __name__ == "__main__":
    setup_app()
    port = int(os.environ.get("FLASK_PORT", 5000))
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_ENV") == "development"
    print(f"[INFO] GridShare Backend running at http://{host}:{port}")
    print(f"[INFO] REST API Health endpoint: http://localhost:{port}/api/health")
    app.run(host=host, port=port, debug=debug, use_reloader=False)
