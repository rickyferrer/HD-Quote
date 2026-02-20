import { NextResponse } from 'next/server';
import { getLivePrices } from '@/lib/metals-api';
import type { PricingData } from '@/lib/types';
import pricingDataJson from '@/data/pricing.json';

const pricingData = pricingDataJson as PricingData;

/**
 * GET /api/metals
 *
 * Returns current live metal prices and adjustment factors.
 * Used by the frontend to display a "live pricing" indicator.
 */
export async function GET() {
  const config = pricingData.commodity_config;
  if (!config) {
    return NextResponse.json({ active: false, reason: 'No commodity config' });
  }

  const livePrices = await getLivePrices(config);

  if (!livePrices) {
    return NextResponse.json({
      active: false,
      reason: process.env.METALS_API_KEY ? 'API unavailable' : 'No API key configured',
    });
  }

  return NextResponse.json({
    active: true,
    asOfDate: livePrices.asOfDate,
    source: livePrices.source,
    spotPrices: livePrices.spotPrices,
    adjustments: livePrices.adjustments,
  });
}
