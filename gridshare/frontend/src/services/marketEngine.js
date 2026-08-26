/**
 * GridShare P2P Energy Market & Microgrid State Engine
 * Handles:
 * - Household energy accounting & net calculations
 * - Virtual wallets and simulated payment settlements
 * - Prosumers listing surplus energy into the public Available Energy Marketplace
 * - Buyers manually browsing listings and clicking [PURCHASE]
 * - Purchase confirmation lifecycle (OPEN -> PENDING_CONFIRMATION -> SETTLED -> TRANSFERRED -> COMPLETED)
 * - Surplus handling (Storage in Community Battery & Grid Export)
 * - Deterministic hackathon demo scenario & full reset
 */

export const INITIAL_DEMO_STATE = {
  households: [
    {
      id: 'house_a',
      name: 'House A',
      type: 'Solar Champion',
      generation: 6.8,
      consumption: 2.1,
      wallet: 50.0,
      initialWallet: 50.0,
      hasSolar: true,
      soldKwh: 0.0,
      boughtKwh: 0.0,
      storedKwh: 0.0,
      exportedKwh: 0.0,
      moneyEarned: 0.0,
      moneySpent: 0.0,
    },
    {
      id: 'house_b',
      name: 'House B',
      type: 'EV Consumer',
      generation: 1.2,
      consumption: 4.0,
      wallet: 100.0,
      initialWallet: 100.0,
      hasSolar: false,
      soldKwh: 0.0,
      boughtKwh: 0.0,
      storedKwh: 0.0,
      exportedKwh: 0.0,
      moneyEarned: 0.0,
      moneySpent: 0.0,
    },
    {
      id: 'house_c',
      name: 'House C',
      type: 'Prosumer Villa',
      generation: 3.5,
      consumption: 2.5,
      wallet: 80.0,
      initialWallet: 80.0,
      hasSolar: true,
      soldKwh: 0.0,
      boughtKwh: 0.0,
      storedKwh: 0.0,
      exportedKwh: 0.0,
      moneyEarned: 0.0,
      moneySpent: 0.0,
    },
  ],
  battery: {
    capacity: 20.0,
    soc: 40.0,
    initialSoc: 40.0,
    storedKwh: 8.0, // 40% of 20 kWh
    minReserve: 20.0,
    roundTripEfficiency: 0.90,
  },
  grid: {
    exportPrice: 6.0,
    importPrice: 6.1,
    p2pBenchmark: 4.5,
  },
  orders: {
    sellOrders: [],
    buyOrders: [],
  },
  transactions: [],
  activePurchase: null, // Pending purchase for user confirmation
  active3dEffects: {
    flows: [], // [{ id, start, end, kw, type, color, label }]
    payment: null, // { from, to, amount, status }
  },
};

/**
 * Computes live calculated states for households including net energy and available surplus/deficit
 */
export function computeHouseholdStates(households, sellOrders = [], buyOrders = [], transactions = []) {
  return households.map((h) => {
    const net = Math.round((h.generation - h.consumption) * 100) / 100;
    const isSurplus = net > 0.001;
    const isDeficit = net < -0.001;

    // Sum open and partially filled sell orders committed by this household
    const activeSellCommitted = sellOrders
      .filter((o) => o.household_id === h.id && (o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'))
      .reduce((sum, o) => sum + o.remaining_kwh, 0);

    // Available sellable surplus = max(0, net - already committed - sold - stored - exported)
    const baseSurplus = isSurplus ? net : 0;
    const usedSurplus = (h.soldKwh || 0) + (h.storedKwh || 0) + (h.exportedKwh || 0) + activeSellCommitted;
    const availableSurplus = Math.max(0, Math.round((baseSurplus - usedSurplus) * 100) / 100);

    // Remaining deficit to cover
    const baseDeficit = isDeficit ? Math.abs(net) : 0;
    const coveredDeficit = h.boughtKwh || 0;
    const remainingDeficit = Math.max(0, Math.round((baseDeficit - coveredDeficit) * 100) / 100);

    return {
      ...h,
      netEnergy: net,
      status: isSurplus ? 'SURPLUS' : isDeficit ? 'DEFICIT' : 'BALANCED',
      surplusKw: baseSurplus,
      deficitKw: baseDeficit,
      availableSurplus,
      remainingDeficit,
      activeSellCommitted: Math.round(activeSellCommitted * 100) / 100,
    };
  });
}

/**
 * Validates Sell Order creation (Seller lists surplus without choosing buyer)
 */
export function validateSellOrder({ household_id, energy_kwh, min_price_per_kwh }, computedHouseholds) {
  const errors = {};
  const house = computedHouseholds.find((h) => h.id === household_id);

  if (!house) {
    errors.household = 'Selected household does not exist';
    return errors;
  }

  const kwh = Number(energy_kwh);
  const price = Number(min_price_per_kwh);

  if (isNaN(kwh) || kwh <= 0) {
    errors.energy = 'Sell amount must be greater than 0 kWh';
  } else if (kwh > house.availableSurplus + 0.001) {
    errors.energy = `Cannot list more than available surplus (${house.availableSurplus.toFixed(1)} kWh)`;
  }

  if (isNaN(price) || price <= 0) {
    errors.price = 'Price must be greater than ₹0/kWh';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validates Manual Energy Purchase Request
 */
export function validatePurchaseOrder({ buyerId, sellOrder, quantityKwh }, computedHouseholds) {
  const errors = {};
  const buyer = computedHouseholds.find((h) => h.id === buyerId);
  const seller = computedHouseholds.find((h) => h.id === sellOrder?.household_id);

  if (!buyer) {
    errors.buyer = 'Buyer household does not exist';
    return errors;
  }

  if (!seller) {
    errors.seller = 'Seller household does not exist';
    return errors;
  }

  if (buyerId === sellOrder.household_id) {
    errors.buyer = 'A household cannot purchase its own energy listing';
    return errors;
  }

  if (sellOrder.status === 'SOLD' || sellOrder.status === 'FILLED' || sellOrder.status === 'CANCELLED') {
    errors.order = 'This energy listing is no longer available';
    return errors;
  }

  const qty = Number(quantityKwh) || sellOrder.remaining_kwh;
  if (qty <= 0) {
    errors.quantity = 'Purchase quantity must be greater than 0 kWh';
  } else if (qty > sellOrder.remaining_kwh + 0.001) {
    errors.quantity = `Cannot purchase more than remaining listing (${sellOrder.remaining_kwh.toFixed(1)} kWh)`;
  }

  const totalCost = qty * sellOrder.min_price_per_kwh;
  if (totalCost > buyer.wallet) {
    errors.wallet = `Insufficient wallet funds (Needs ₹${totalCost.toFixed(2)}, Available ₹${buyer.wallet.toFixed(2)})`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
