# GridShare IoT Hardware Specification

Physical prototype layout for live testbed energy monitoring.

## Bill of Materials (BOM)
1. **2 × ESP32 Microcontrollers** (Node 1 - Solar Prosumer, Node 2 - Consumer).
2. **2 × INA219 High-Side DC Current/Voltage Sensors** (I2C interface).
3. **1 × 0.96" I2C OLED Display (SSD1306)** for local metrics readout.
4. **2 × USB Load / LED Sticks** (Simulated physical electrical loads).
5. **1 × 5V Power Bank** for regulated DC bench power supply.
6. **1 × Solderless Breadboard & Jumper Wires**.

## Pinout Map
- **INA219 #1 (Address 0x40)**: `SDA -> GPIO 21`, `SCL -> GPIO 22`, `VCC -> 3.3V`, `GND -> GND`.
- **INA219 #2 (Address 0x41)**: `SDA -> GPIO 21`, `SCL -> GPIO 22`, `VCC -> 3.3V`, `GND -> GND`.
- **OLED Display (0x3C)**: `SDA -> GPIO 21`, `SCL -> GPIO 22`, `VCC -> 3.3V`, `GND -> GND`.
- **Telemetry Payload**: JSON transmitted via HTTP POST to `http://<HOST>:5000/api/telemetry` or MQTT topic `gridshare/telemetry`.
