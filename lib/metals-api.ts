/**
 * Metals-API integration for live commodity pricing.
 *
 * Fetches spot prices from metals-api.com and computes adjustment
 * factors for each material in the quoting system.  Falls back to
 * static pricing when the API key is absent or a request fails.
 *
 * Prices are cached in-memory for 1 hour to minimise API calls.
 */

import type { CommodityConfig, MetalPriceCache, LivePriceResult, PricingData } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const API_BASE = 'https://metals-api.com/api';
const TROY_OZ_PER_LB = 14.5833; // 1 lb ≈ 14.5833 troy ounces

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let cache: MetalPriceCache | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert the metals-api rate (units-of-metal per 1 USD) to USD/lb. */
function rateToPricePerLb(rate: number): number {
  if (rate <= 0) return 0;
  const pricePerTroyOz = 1 / rate;
  return pricePerTroyOz * TROY_OZ_PER_LB;
}

/**
 * Compute adjustment factor for a single material.
 *
 *   factor = 1 + sensitivity × (live_price / baseline_price − 1)
 *
 * If live_price equals baseline_price the factor is 1 (no change).
 * `sensitivity` (0–1) controls how strongly commodity swings affect
 * the finished-sheet price — e.g. 0.6 means 60 % of the sheet cost
 * is raw-material driven.
 */
function computeAdjustment(
  livePricePerLb: number,
  baselinePricePerLb: number,
  sensitivity: number
): number {
  if (baselinePricePerLb <= 0 || livePricePerLb <= 0) return 1;
  return 1 + sensitivity * (livePricePerLb / baselinePricePerLb - 1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch live metal prices and return per-material adjustment factors.
 *
 * Returns `null` when:
 *  - METALS_API_KEY env var is not set
 *  - The upstream API request fails
 *  - Any other unexpected error occurs
 *
 * Successful results are cached for 1 hour.
 */
export async function getLivePrices(
  commodityConfig: Record<string, CommodityConfig>
): Promise<LivePriceResult | null> {
  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) return null;

  // Return cached result if still fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.result;
  }

  // Collect the unique symbols we need
  const symbols = [
    ...new Set(Object.values(commodityConfig).map(c => c.symbol)),
  ].join(',');

  try {
    const url = `${API_BASE}/latest?access_key=${apiKey}&base=USD&symbols=${symbols}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.error(`Metals-API HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      success: boolean;
      rates?: Record<string, number>;
      date?: string;
    };

    if (!data.success || !data.rates) {
      console.error('Metals-API returned unsuccessful response');
      return null;
    }

    // Build per-material adjustments
    const adjustments: Record<string, number> = {};
    const spotPrices: Record<string, number> = {};

    for (const [material, config] of Object.entries(commodityConfig)) {
      const rate = data.rates[config.symbol];
      if (rate == null) {
        adjustments[material] = 1; // no data → no adjustment
        continue;
      }
      const livePricePerLb = rateToPricePerLb(rate);
      spotPrices[material] = Math.round(livePricePerLb * 100) / 100;
      adjustments[material] = computeAdjustment(
        livePricePerLb,
        config.baseline_usd_per_lb,
        config.sensitivity
      );
    }

    const result: LivePriceResult = {
      adjustments,
      spotPrices,
      asOfDate: data.date ?? new Date().toISOString().slice(0, 10),
      source: 'metals-api.com',
    };

    // Cache it
    cache = { result, fetchedAt: Date.now() };

    return result;
  } catch (err) {
    console.error('Metals-API fetch error:', err);
    return null;
  }
}

/**
 * Apply live price adjustments to the pricing data's sheet costs.
 * Returns a deep-cloned copy with adjusted sheet prices.  If
 * `livePrices` is null the original data is returned unchanged.
 */
export function applyLivePricing(
  pricingData: PricingData,
  livePrices: LivePriceResult | null
): PricingData {
  if (!livePrices) return pricingData;

  // Deep clone so we don't mutate the original
  const adjusted: PricingData = JSON.parse(JSON.stringify(pricingData));

  for (const mat of adjusted.materials) {
    const factor = livePrices.adjustments[mat.name];
    if (factor == null || factor === 1) continue;

    for (const gauge of mat.gauges) {
      for (const key of Object.keys(gauge.sheets)) {
        gauge.sheets[key] = Math.round(gauge.sheets[key] * factor * 100) / 100;
      }
    }
  }

  return adjusted;
}
