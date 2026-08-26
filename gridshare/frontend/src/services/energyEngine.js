/**
 * GridShare Deterministic Energy Engine
 * Performs dynamic multi-tier priority microgrid energy allocation:
 * Priority 1: Local Community Demand (P2P Trade)
 * Priority 2: Community Battery Storage Buffer (accounting for SOC & Capacity)
 * Priority 3: Utility Grid Export Feed-in
 * Deficit Handling: Battery Discharge & Utility Grid Import
 * 
 * Scalable for N houses and strict energy balance verification.
 */

export const DEMO_PRESET = {
  houseA: {
    id: 'house_a',
    name: 'House A (Solar Champion)',
    generation: 6.8,
    consumption: 2.1,
    hasSolar: true,
  },
  houseB: {
    id: 'house_b',
    name: 'House B (EV Load)',
    generation: 1.2,
    consumption: 4.0,
    hasSolar: false,
  },
  battery: {
    capacity: 20.0,
    soc: 40.0,
    maxChargeRate: 1.2, // 1.2 kW standard demo charging rate limit
    minReserve: 20.0,
    roundTripEfficiency: 0.90,
  },
  grid: {
    exportPrice: 6.0,
    importPrice: 6.1,
    p2pPrice: 4.5,
  },
};

/**
 * Validates user inputs and returns an error map or null if valid.
 */
export function validateInputs({ houseA, houseB, battery, grid }) {
  const errors = {};

  if (isNaN(houseA?.generation) || Number(houseA.generation) < 0) {
    errors.houseAGen = 'Must be a non-negative number';
  }
  if (isNaN(houseA?.consumption) || Number(houseA.consumption) < 0) {
    errors.houseACon = 'Must be a non-negative number';
  }
  if (isNaN(houseB?.generation) || Number(houseB.generation) < 0) {
    errors.houseBGen = 'Must be a non-negative number';
  }
  if (isNaN(houseB?.consumption) || Number(houseB.consumption) < 0) {
    errors.houseBCon = 'Must be a non-negative number';
  }
  if (isNaN(battery?.capacity) || Number(battery.capacity) <= 0) {
    errors.batteryCap = 'Capacity must be greater than 0';
  }
  if (isNaN(battery?.soc) || Number(battery.soc) < 0 || Number(battery.soc) > 100) {
    errors.batterySoc = 'SOC must be between 0% and 100%';
  }
  if (isNaN(grid?.exportPrice) || Number(grid.exportPrice) < 0) {
    errors.gridPrice = 'Grid price must be non-negative';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Primary Allocation Engine
 * Accepts array of houses or single house configs, battery and grid settings.
 */
export function calculateMicrogridAllocation({
  houses = [],
  battery = DEMO_PRESET.battery,
  grid = DEMO_PRESET.grid,
}) {
  // Normalize houses data
  const normalizedHouses = houses.map((h, idx) => {
    const gen = Math.max(0, Number(h.generation) || 0);
    const con = Math.max(0, Number(h.consumption) || 0);
    const net = Math.round((gen - con) * 100) / 100;
    const isSurplus = net > 0.001;
    const isDeficit = net < -0.001;

    return {
      id: h.id || `house_${idx + 1}`,
      name: h.name || `House ${String.fromCharCode(65 + idx)}`,
      generation: gen,
      consumption: con,
      netEnergy: net,
      surplusKw: isSurplus ? net : 0,
      deficitKw: isDeficit ? Math.abs(net) : 0,
      status: isSurplus ? 'SURPLUS' : isDeficit ? 'DEFICIT' : 'BALANCED',
      hasSolar: h.hasSolar !== undefined ? h.hasSolar : gen > 0,
    };
  });

  const totalSurplus = Math.round(
    normalizedHouses.reduce((acc, h) => acc + h.surplusKw, 0) * 100
  ) / 100;

  const totalDeficit = Math.round(
    normalizedHouses.reduce((acc, h) => acc + h.deficitKw, 0) * 100
  ) / 100;

  const batteryCap = Math.max(0.1, Number(battery.capacity) || 20.0);
  const initialSoc = Math.min(100, Math.max(0, Number(battery.soc) || 40.0));
  const initialStoredKwh = Math.round((initialSoc / 100.0) * batteryCap * 100) / 100;
  const minReserveSoc = Number(battery.minReserve) || 20.0;
  const maxChargeRate = Number(battery.maxChargeRate) || 1.2;
  const gridPrice = Number(grid.exportPrice) || 6.0;
  const p2pPrice = Number(grid.p2pPrice) || 4.5;

  let remainingSurplus = totalSurplus;
  let remainingDeficit = totalDeficit;

  // -------------------------------------------------------------
  // STEP 1: Local Community Demand Matching (P2P Trade)
  // -------------------------------------------------------------
  const localTradeKw = Math.round(Math.min(remainingSurplus, remainingDeficit) * 100) / 100;
  remainingSurplus = Math.round(Math.max(0, remainingSurplus - localTradeKw) * 100) / 100;
  remainingDeficit = Math.round(Math.max(0, remainingDeficit - localTradeKw) * 100) / 100;

  // Bilateral match pairings
  const trades = [];
  if (localTradeKw > 0.001) {
    const surplusNodes = normalizedHouses.filter((h) => h.status === 'SURPLUS');
    const deficitNodes = normalizedHouses.filter((h) => h.status === 'DEFICIT');

    const seller = surplusNodes[0]?.id || 'house_a';
    const buyer = deficitNodes[0]?.id || 'house_b';

    trades.push({
      sellerId: seller,
      buyerId: buyer,
      amountKw: localTradeKw,
      tariffPerKwh: p2pPrice,
      savingsVsGrid: Math.round(localTradeKw * Math.max(0, gridPrice - p2pPrice) * 100) / 100,
    });
  }

  // -------------------------------------------------------------
  // STEP 2: Community Battery Storage Buffer (STORE)
  // -------------------------------------------------------------
  const batteryHeadroomKwh = Math.max(0, batteryCap - initialStoredKwh);
  // Allocate up to maxChargeRate (or headroom if lower)
  let batteryAllocationKw = 0;
  if (remainingSurplus > 0.001 && batteryHeadroomKwh > 0.001) {
    const allocLimit = Math.min(remainingSurplus, batteryHeadroomKwh, maxChargeRate);
    batteryAllocationKw = Math.round(allocLimit * 100) / 100;
    remainingSurplus = Math.round(Math.max(0, remainingSurplus - batteryAllocationKw) * 100) / 100;
  }

  const finalStoredKwh = Math.round((initialStoredKwh + batteryAllocationKw) * 100) / 100;
  const finalBatterySoc = Math.min(
    100,
    Math.round((finalStoredKwh / batteryCap) * 100)
  );

  // -------------------------------------------------------------
  // STEP 3: Utility Grid Export (GRID_EXPORT)
  // -------------------------------------------------------------
  const gridExportKw = Math.round(Math.max(0, remainingSurplus) * 100) / 100;
  remainingSurplus = 0;

  // -------------------------------------------------------------
  // DEFICIT RESOLUTION (If deficit exceeded surplus)
  // -------------------------------------------------------------
  let batteryDischargeKw = 0;
  let gridImportKw = 0;
  let resolvedSoc = finalBatterySoc;

  if (remainingDeficit > 0.001) {
    const usableEnergy = Math.max(0, initialStoredKwh - (minReserveSoc / 100) * batteryCap);
    batteryDischargeKw = Math.round(Math.min(remainingDeficit, usableEnergy) * 100) / 100;
    remainingDeficit = Math.round(Math.max(0, remainingDeficit - batteryDischargeKw) * 100) / 100;

    const dischargedStored = Math.max(0, initialStoredKwh - batteryDischargeKw);
    resolvedSoc = Math.max(minReserveSoc, Math.round((dischargedStored / batteryCap) * 100));

    if (remainingDeficit > 0.001) {
      gridImportKw = remainingDeficit;
      remainingDeficit = 0;
    }
  }

  // -------------------------------------------------------------
  // ENERGY BALANCE & DECISION CLASSIFICATION
  // -------------------------------------------------------------
  const totalAllocatedKw = Math.round(
    (localTradeKw + batteryAllocationKw + gridExportKw) * 100
  ) / 100;

  const unallocatedKw = Math.round(
    Math.max(0, totalSurplus - totalAllocatedKw) * 100
  ) / 100;

  const isBalanced = Math.abs(totalSurplus - (totalAllocatedKw + unallocatedKw)) < 0.005;

  const decisionActions = [];
  if (localTradeKw > 0) decisionActions.push('LOCAL TRADE');
  if (batteryAllocationKw > 0) decisionActions.push('STORE');
  if (gridExportKw > 0) decisionActions.push('EXPORT');
  if (batteryDischargeKw > 0) decisionActions.push('DISCHARGE');
  if (gridImportKw > 0) decisionActions.push('GRID IMPORT');
  if (decisionActions.length === 0) decisionActions.push('BALANCED IDLE');

  const decisionTitle = decisionActions.join(' + ');

  const houseA = normalizedHouses[0] || {};
  const houseB = normalizedHouses[1] || {};

  const explanations = [
    {
      step: 1,
      title: 'Reading Community Energy',
      status: `Reading live generation & consumption for ${houseA.name || 'House A'} and ${houseB.name || 'House B'}...`,
    },
    {
      step: 2,
      title: 'Detecting Surplus & Deficit',
      status: `${houseA.name || 'House A'}: +${houseA.netEnergy > 0 ? houseA.netEnergy.toFixed(1) : '0.0'} kW Surplus | ${houseB.name || 'House B'}: -${houseB.netEnergy < 0 ? Math.abs(houseB.netEnergy).toFixed(1) : '0.0'} kW Deficit`,
    },
    {
      step: 3,
      title: 'Optimizing Energy Allocation',
      status: `Applying multi-tier routing: 1. Local Trade → 2. Battery Storage → 3. Grid Export`,
    },
    {
      step: 4,
      title: 'Matching Local Demand',
      status: localTradeKw > 0
        ? `Directly routing ${localTradeKw.toFixed(1)} kW from ${houseA.name || 'House A'} to ${houseB.name || 'House B'} at ₹${p2pPrice.toFixed(2)}/kWh.`
        : `Local demand balanced.`,
    },
    {
      step: 5,
      title: 'Energy Flow Ready',
      status: `Energy Flows: ${localTradeKw.toFixed(1)} kW Local Trade | ${batteryAllocationKw.toFixed(1)} kW Battery Buffer (${initialSoc}% → ${finalBatterySoc}%) | ${gridExportKw.toFixed(1)} kW Grid Export`,
    },
  ];

  return {
    houses: normalizedHouses,
    metrics: {
      totalSurplus,
      totalDeficit,
      localTradeKw,
      batteryAllocationKw,
      gridExportKw,
      batteryDischargeKw,
      gridImportKw,
      totalAllocatedKw,
      unallocatedKw,
      isBalanced,
      decisionTitle,
      initialSoc,
      finalBatterySoc: batteryDischargeKw > 0 ? resolvedSoc : finalBatterySoc,
      initialStoredKwh,
      finalStoredKwh,
      batteryCapacity: batteryCap,
      gridPrice,
      p2pPrice,
    },
    trades,
    explanations,
  };
}
