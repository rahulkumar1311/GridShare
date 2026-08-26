/**
 * GridShare Control Center & Diurnal Simulation Engine
 * Powers the interactive Dashboard with:
 * - Deterministic time simulation (06:00 to 24:00)
 * - Multi-tier energy allocation (P2P -> Battery -> Grid)
 * - Scenarios (Normal, High Solar, High Demand, Low Solar, Evening Peak)
 * - Live chart history generator
 * - Manual battery charge/discharge & grid import/export actions
 */

export const DIURNAL_PROFILES = {
  // Base solar multipliers for hours 0-23
  solarMultiplier: [
    0, 0, 0, 0, 0, 0,
    0.1, 0.35, 0.65, 0.88, 1.0, 1.0,
    0.95, 0.85, 0.65, 0.40, 0.15, 0.05,
    0, 0, 0, 0, 0, 0
  ],
  // Base consumption multipliers for hours 0-23
  loadMultiplier: [
    0.5, 0.45, 0.4, 0.4, 0.45, 0.6,
    0.85, 1.0, 0.9, 0.8, 0.75, 0.8,
    0.85, 0.8, 0.85, 0.9, 1.1, 1.35,
    1.45, 1.3, 1.1, 0.9, 0.75, 0.6
  ]
};

export const PRESET_SCENARIOS = {
  NORMAL_DAY: {
    name: 'Normal Day',
    description: 'Balanced solar irradiance with standard household diurnal demand',
    households: [
      { id: 'house_a', name: 'House A', type: 'Solar Champion', generation: 6.8, consumption: 2.1, hasSolar: true },
      { id: 'house_b', name: 'House B', type: 'EV Consumer', generation: 1.2, consumption: 4.0, hasSolar: false },
      { id: 'house_c', name: 'House C', type: 'Prosumer Villa', generation: 3.5, consumption: 2.5, hasSolar: true },
    ],
    battery: { soc: 40, capacity: 20, storedKwh: 8.0 },
    hour: 12,
  },
  HIGH_SOLAR: {
    name: 'High Solar Noon',
    description: 'Clear sky peak generation with high exportable community surplus',
    households: [
      { id: 'house_a', name: 'House A', type: 'Solar Champion', generation: 9.2, consumption: 1.8, hasSolar: true },
      { id: 'house_b', name: 'House B', type: 'EV Consumer', generation: 1.5, consumption: 3.2, hasSolar: false },
      { id: 'house_c', name: 'House C', type: 'Prosumer Villa', generation: 5.0, consumption: 2.0, hasSolar: true },
    ],
    battery: { soc: 60, capacity: 20, storedKwh: 12.0 },
    hour: 13,
  },
  HIGH_DEMAND: {
    name: 'High Demand Stress',
    description: 'Heavy EV charging and residential loads exceeding solar production',
    households: [
      { id: 'house_a', name: 'House A', type: 'Solar Champion', generation: 4.0, consumption: 4.5, hasSolar: true },
      { id: 'house_b', name: 'House B', type: 'EV Consumer', generation: 0.5, consumption: 6.5, hasSolar: false },
      { id: 'house_c', name: 'House C', type: 'Prosumer Villa', generation: 2.0, consumption: 4.2, hasSolar: true },
    ],
    battery: { soc: 30, capacity: 20, storedKwh: 6.0 },
    hour: 15,
  },
  LOW_SOLAR: {
    name: 'Monsoon Overcast',
    description: 'Cloud cover reducing solar PV output by 70%',
    households: [
      { id: 'house_a', name: 'House A', type: 'Solar Champion', generation: 1.8, consumption: 2.5, hasSolar: true },
      { id: 'house_b', name: 'House B', type: 'EV Consumer', generation: 0.2, consumption: 3.8, hasSolar: false },
      { id: 'house_c', name: 'House C', type: 'Prosumer Villa', generation: 0.9, consumption: 2.3, hasSolar: true },
    ],
    battery: { soc: 25, capacity: 20, storedKwh: 5.0 },
    hour: 11,
  },
  EVENING_PEAK: {
    name: 'Evening Peak Hour',
    description: 'Zero solar production with maximum residential lighting and cooling load',
    households: [
      { id: 'house_a', name: 'House A', type: 'Solar Champion', generation: 0.0, consumption: 3.5, hasSolar: true },
      { id: 'house_b', name: 'House B', type: 'EV Consumer', generation: 0.0, consumption: 5.8, hasSolar: false },
      { id: 'house_c', name: 'House C', type: 'Prosumer Villa', generation: 0.0, consumption: 3.2, hasSolar: true },
    ],
    battery: { soc: 50, capacity: 20, storedKwh: 10.0 },
    hour: 19,
  },
};

/**
 * Generates continuous 24-hour simulation history based on current household settings
 */
export function generate24HourProfile(households, currentHour = 12, currentBatterySoc = 40) {
  const baseTotalGen = households.reduce((sum, h) => sum + (h.hasSolar ? h.generation : 0), 0);
  const baseTotalCon = households.reduce((sum, h) => sum + h.consumption, 0);

  const points = [];
  let simulatedSoc = Math.max(20, currentBatterySoc - 15);

  for (let h = 6; h <= 22; h++) {
    const timeStr = `${String(h).padStart(2, '0')}:00`;
    const sMult = DIURNAL_PROFILES.solarMultiplier[h] || 0;
    const lMult = DIURNAL_PROFILES.loadMultiplier[h] || 1;

    const gen = Math.round(baseTotalGen * sMult * 10) / 10;
    const con = Math.round(baseTotalCon * (lMult / 1.1) * 10) / 10;
    const net = Math.round((gen - con) * 10) / 10;

    // Simulate battery charge/discharge behavior
    if (net > 0) {
      simulatedSoc = Math.min(95, simulatedSoc + net * 2.2);
    } else {
      simulatedSoc = Math.max(20, simulatedSoc + net * 1.8);
    }

    points.push({
      time: timeStr,
      hour: h,
      generation: gen,
      consumption: con,
      net: net,
      batterySoc: Math.round(simulatedSoc),
      isCurrent: h === currentHour,
    });
  }

  return points;
}

/**
 * Calculates multi-tier deterministic energy dispatch flows
 */
export function calculateMicrogridFlows(households, battery, grid, positions) {
  const flows = [];
  const houseA = households.find((h) => h.id === 'house_a') || { generation: 6.8, consumption: 2.1 };
  const houseB = households.find((h) => h.id === 'house_b') || { generation: 1.2, consumption: 4.0 };
  const houseC = households.find((h) => h.id === 'house_c') || { generation: 3.5, consumption: 2.5 };

  const netA = Math.round((houseA.generation - houseA.consumption) * 100) / 100;
  const netB = Math.round((houseB.generation - houseB.consumption) * 100) / 100;
  const netC = Math.round((houseC.generation - houseC.consumption) * 100) / 100;

  // 1. Solar generation source flow to House A if generating
  if (houseA.generation > 0.1 && positions['solarSun'] && positions['house_a']) {
    flows.push({
      id: 'flow-sun-a',
      start: positions['solarSun'],
      end: positions['house_a'],
      kw: houseA.generation,
      type: 'ENERGY',
      color: '#f59e0b',
      label: `Solar PV: ${houseA.generation.toFixed(1)} kW`,
      isActive: true,
    });
  }

  // 2. Prosumer P2P Energy Sharing to Consumer in Deficit (House A -> House B)
  if (netA > 0.1 && netB < -0.1 && positions['house_a'] && positions['house_b']) {
    const p2pTransfer = Math.min(netA, Math.abs(netB));
    flows.push({
      id: 'flow-p2p-a-b',
      start: positions['house_a'],
      end: positions['house_b'],
      kw: p2pTransfer,
      type: 'ENERGY',
      color: '#059669',
      label: `P2P Transfer: ${p2pTransfer.toFixed(1)} kW`,
      isActive: true,
    });
  }

  // 3. House C Sharing or Self-Balancing
  if (netC > 0.1 && netB < -0.1 && positions['house_c'] && positions['house_b']) {
    const p2pCtoB = Math.min(netC, 1.0);
    flows.push({
      id: 'flow-p2p-c-b',
      start: positions['house_c'],
      end: positions['house_b'],
      kw: p2pCtoB,
      type: 'ENERGY',
      color: '#10b981',
      label: `P2P Share: ${p2pCtoB.toFixed(1)} kW`,
      isActive: true,
    });
  }

  // 4. Community Battery Buffer Flow (House A Surplus -> Battery)
  if (netA > 2.8 && battery.soc < 95 && positions['house_a'] && positions['COMMUNITY_BATTERY']) {
    const storageFlow = Math.min(netA - 2.8, 1.5);
    flows.push({
      id: 'flow-a-batt',
      start: positions['house_a'],
      end: positions['COMMUNITY_BATTERY'],
      kw: storageFlow,
      type: 'ENERGY',
      color: '#0d9488',
      label: `Storage Buffer: ${storageFlow.toFixed(1)} kW`,
      isActive: true,
    });
  }

  // 5. Battery Discharge to House B if deficit exists and battery > 20%
  if (netA <= 0 && netB < -0.5 && battery.soc > 20 && positions['COMMUNITY_BATTERY'] && positions['house_b']) {
    const dischargeFlow = Math.min(Math.abs(netB), 2.5);
    flows.push({
      id: 'flow-batt-b',
      start: positions['COMMUNITY_BATTERY'],
      end: positions['house_b'],
      kw: dischargeFlow,
      type: 'ENERGY',
      color: '#0d9488',
      label: `Battery Discharge: ${dischargeFlow.toFixed(1)} kW`,
      isActive: true,
    });
  }

  // 6. Utility Grid Export Flow (Remaining Surplus -> Grid)
  const totalNet = netA + netB + netC;
  if (totalNet > 0.5 && positions['house_a'] && positions['MAIN_UTILITY_GRID']) {
    const gridExport = Math.min(totalNet, 2.0);
    flows.push({
      id: 'flow-grid-export',
      start: positions['house_a'],
      end: positions['MAIN_UTILITY_GRID'],
      kw: gridExport,
      type: 'ENERGY',
      color: '#2563eb',
      label: `Grid Export: ${gridExport.toFixed(1)} kW`,
      isActive: true,
    });
  } else if (totalNet < -0.5 && positions['MAIN_UTILITY_GRID'] && positions['house_b']) {
    // Grid Import Flow
    const gridImport = Math.min(Math.abs(totalNet), 3.5);
    flows.push({
      id: 'flow-grid-import',
      start: positions['MAIN_UTILITY_GRID'],
      end: positions['house_b'],
      kw: gridImport,
      type: 'ENERGY',
      color: '#f43f5e',
      label: `Grid Import: ${gridImport.toFixed(1)} kW`,
      isActive: true,
    });
  }

  return flows;
}
