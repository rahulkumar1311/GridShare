import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import ResidentialHouse3D from './ResidentialHouse3D';
import { X, Sparkles, Sun, BatteryCharging, Gauge, Wind, Tv, Refrigerator, Shirt } from 'lucide-react';

/**
 * 3D Residential House Canvas
 * Full camera controls, day-to-night lighting calculation, and interactive click-to-inspect drawer.
 */
export default function ResidentialHouseCanvas3D({
  solarKw = 4.8,
  loadKw = 2.6,
  batterySoc = 68,
  batteryCapacity = 10,
  batteryPowerKw = 0,
  gridPowerKw = 0,
  p2pPowerKw = 0,
  appliances = {},
  cloudCover = false,
  timeHour = 12,
  selectedElement = null,
  onSelectElement = () => {},
}) {
  // Compute sun elevation and ambient light based on time of day (0 to 24 hours)
  const isNight = timeHour < 6 || timeHour > 19;
  const isTwilight = (timeHour >= 5 && timeHour < 7) || (timeHour >= 18 && timeHour <= 20);

  const sunAngle = ((timeHour - 6) / 12) * Math.PI;
  const sunX = Math.cos(sunAngle) * 14;
  const sunY = Math.max(0.5, Math.sin(sunAngle) * 15);
  const sunZ = 9;

  const sunIntensity = isNight ? 0.2 : cloudCover ? 0.65 : isTwilight ? 0.95 : 1.7;
  const sunColor = isNight ? '#38bdf8' : isTwilight ? '#fb923c' : cloudCover ? '#cbd5e1' : '#fffbeb';
  const ambientIntensity = isNight ? 0.35 : cloudCover ? 0.65 : 0.9;

  // Inspect Card Details Dictionary
  const INSPECT_INFO = {
    solar: {
      title: 'Rooftop Solar PV Array',
      icon: Sun,
      color: 'text-amber-400',
      stats: [
        { label: 'Current Output', value: `${solarKw.toFixed(2)} kW` },
        { label: 'Irradiation Condition', value: cloudCover ? 'Cloud Cover (55%)' : 'Clear Sun (100%)' },
        { label: 'Panel Efficiency', value: '82% Monocrystalline' },
      ],
    },
    battery: {
      title: 'Home Wall Battery (ESS)',
      icon: BatteryCharging,
      color: 'text-emerald-400',
      stats: [
        { label: 'State of Charge', value: `${batterySoc.toFixed(1)}%` },
        { label: 'Stored Energy', value: `${((batteryCapacity * batterySoc) / 100).toFixed(2)} / ${batteryCapacity} kWh` },
        { label: 'Active Power Flow', value: batteryPowerKw > 0 ? `Charging +${batteryPowerKw.toFixed(1)} kW` : batteryPowerKw < 0 ? `Discharging ${batteryPowerKw.toFixed(1)} kW` : 'Idle Standby' },
      ],
    },
    meter: {
      title: 'Smart Bi-Directional Meter',
      icon: Gauge,
      color: 'text-blue-400',
      stats: [
        { label: 'Active Power', value: gridPowerKw > 0 ? `Exporting +${gridPowerKw.toFixed(2)} kW` : gridPowerKw < 0 ? `Importing ${Math.abs(gridPowerKw).toFixed(2)} kW` : 'Balanced 0 kW' },
        { label: 'Grid Voltage', value: '230 V (50 Hz)' },
        { label: 'Grid Tariff', value: '₹6.10/kWh Standard' },
      ],
    },
    load: {
      title: 'Active Household Load',
      icon: Sparkles,
      color: 'text-cyan-400',
      stats: [
        { label: 'Total Demand', value: `${loadKw.toFixed(2)} kW` },
        { label: 'Active Appliances', value: `${Object.values(appliances).filter(Boolean).length} Units Running` },
        { label: 'Power Source', value: solarKw >= loadKw ? '100% Rooftop Solar' : batterySoc > 20 ? 'Solar + Home Battery' : 'Utility Grid' },
      ],
    },
    ac: {
      title: 'Air Conditioner (AC)',
      icon: Wind,
      color: 'text-cyan-400',
      stats: [
        { label: 'Rated Power', value: '1.2 kW' },
        { label: 'Status', value: appliances.ac ? 'RUNNING (Eco Inverter)' : 'OFFLINE' },
        { label: 'Zone', value: 'Upper Floor Bedroom' },
      ],
    },
    fridge: {
      title: 'Smart Refrigerator',
      icon: Refrigerator,
      color: 'text-emerald-400',
      stats: [
        { label: 'Rated Power', value: '0.2 kW' },
        { label: 'Status', value: appliances.fridge ? 'RUNNING (Compressor Eco)' : 'OFFLINE' },
        { label: 'Zone', value: 'Kitchen' },
      ],
    },
    livingRoom: {
      title: 'Living Room & Entertainment',
      icon: Tv,
      color: 'text-indigo-400',
      stats: [
        { label: 'Rated Power', value: '0.4 kW' },
        { label: 'Status', value: appliances.livingRoom ? 'ACTIVE (OLED TV + LED)' : 'OFFLINE' },
        { label: 'Zone', value: 'Ground Floor Lounge' },
      ],
    },
    washingMachine: {
      title: 'Smart Washing Machine',
      icon: Shirt,
      color: 'text-blue-400',
      stats: [
        { label: 'Rated Power', value: '0.3 kW' },
        { label: 'Status', value: appliances.washingMachine ? 'RUNNING (Wash Cycle)' : 'IDLE' },
        { label: 'Zone', value: 'Utility Room' },
      ],
    },
  };

  const selectedInfo = selectedElement ? INSPECT_INFO[selectedElement] : null;

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full"
      >
        {/* Slightly wider isometric 3/4 perspective camera */}
        <PerspectiveCamera makeDefault position={[10.5, 8.0, 11.5]} fov={36} />

        {/* Orbit Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={6}
          maxDistance={25}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 0.9, 0]}
        />

        {/* Day / Night Lighting */}
        <ambientLight intensity={ambientIntensity} color={isNight ? '#60a5fa' : '#ffffff'} />
        <directionalLight
          position={[sunX, sunY, sunZ]}
          intensity={sunIntensity}
          color={sunColor}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-2, 3, 2]} intensity={0.4} color="#38bdf8" />
        <pointLight position={[2, 2, -2]} intensity={0.3} color="#fbbf24" />

        <Suspense fallback={null}>
          <ResidentialHouse3D
            solarKw={solarKw}
            loadKw={loadKw}
            batterySoc={batterySoc}
            batteryCapacity={batteryCapacity}
            batteryPowerKw={batteryPowerKw}
            gridPowerKw={gridPowerKw}
            p2pPowerKw={p2pPowerKw}
            appliances={appliances}
            cloudCover={cloudCover}
            timeHour={timeHour}
            selectedElement={selectedElement}
            onSelectElement={onSelectElement}
          />
        </Suspense>
      </Canvas>

      {/* Top-Left Header Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 backdrop-blur-md shadow-xs pointer-events-auto">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10.5px] font-bold text-slate-200 tracking-wider">
              3D RESIDENTIAL DIGITAL TWIN
            </span>
          </div>
        </div>
      </div>

      {/* Top-Right Click-to-Inspect Compact Floating Drawer */}
      {selectedInfo && (
        <div className="absolute top-3 right-3 max-w-[240px] rounded-xl border border-white/15 bg-slate-950/80 p-3 backdrop-blur-md shadow-xl transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
            <div className="flex items-center space-x-1.5">
              <selectedInfo.icon className={`h-4 w-4 ${selectedInfo.color}`} />
              <span className="font-bold text-xs text-white truncate">{selectedInfo.title}</span>
            </div>
            <button
              onClick={() => onSelectElement(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
              aria-label="Close details"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {selectedInfo.stats.map((st, i) => (
              <div key={i} className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 text-[10px]">{st.label}:</span>
                <span className="font-mono font-bold text-white text-[10.5px]">{st.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
