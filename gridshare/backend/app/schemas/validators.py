"""
Input validation utilities for GridShare REST API endpoints.
"""

def validate_telemetry_payload(data):
    if not isinstance(data, dict):
        return False, "Payload must be a JSON object"
    
    required_fields = ["household_id", "generation_kw", "consumption_kw"]
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: '{field}'"
        
    try:
        float(data["generation_kw"])
        float(data["consumption_kw"])
    except (ValueError, TypeError):
        return False, "generation_kw and consumption_kw must be numeric"

    if data.get("battery_soc") is not None:
        try:
            soc = float(data["battery_soc"])
            if not (0.0 <= soc <= 100.0):
                return False, "battery_soc must be between 0 and 100"
        except (ValueError, TypeError):
            return False, "battery_soc must be numeric"

    return True, None

def validate_battery_patch(data):
    if not isinstance(data, dict):
        return False, "Payload must be a JSON object"
    
    if "current_soc" in data:
        try:
            soc = float(data["current_soc"])
            if not (0.0 <= soc <= 100.0):
                return False, "current_soc must be between 0 and 100"
        except (ValueError, TypeError):
            return False, "current_soc must be numeric"

    if "min_reserve" in data:
        try:
            res = float(data["min_reserve"])
            if not (0.0 <= res <= 100.0):
                return False, "min_reserve must be between 0 and 100"
        except (ValueError, TypeError):
            return False, "min_reserve must be numeric"

    return True, None
