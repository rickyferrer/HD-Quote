import type {
  ParsedDxf,
  PricingData,
  QuoteEstimate,
  OrderType,
} from './types';
import { calculateNesting } from './nesting';

function getSetupFee(
  pricingData: PricingData,
  orderType: OrderType,
  hasBending: boolean
): number {
  const fees = pricingData.setup_fees;
  if (orderType === 'new') {
    return hasBending ? fees.new_part_with_bending : fees.new_part_no_bending;
  }
  return hasBending ? fees.repeat_with_bending : fees.repeat_no_bending;
}

function getSheetCostKey(sheetWidth: number, sheetHeight: number): string {
  return `${sheetWidth}x${sheetHeight}`;
}

export function calculateEstimate(
  parsedDxf: ParsedDxf,
  material: string,
  gauge: string,
  quantity: number,
  hasBending: boolean,
  numberOfBends: number,
  orderType: OrderType,
  pricingData: PricingData
): QuoteEstimate {
  // Find the selected material and gauge
  const materialData = pricingData.materials.find(m => m.name === material);
  if (!materialData) {
    throw new Error(`Material "${material}" not found in pricing data`);
  }

  const gaugeData = materialData.gauges.find(g => g.label === gauge);
  if (!gaugeData) {
    throw new Error(`Gauge "${gauge}" not found for material "${material}"`);
  }

  // Run nesting calculation
  const allNesting = calculateNesting(
    parsedDxf.boundingBox.width,
    parsedDxf.boundingBox.height,
    quantity,
    pricingData.nesting.sheet_sizes,
    pricingData.nesting.kerf_spacing_inches
  );

  // Find the best nesting result (highest utilization with parts fitting)
  const validNesting = allNesting.filter(n => n.partsPerSheet > 0);
  if (validNesting.length === 0) {
    throw new Error('Part is too large to fit on any available sheet size');
  }
  const bestNesting = validNesting[0]; // Already sorted by utilization

  // Calculate costs
  const sheetKey = getSheetCostKey(bestNesting.sheetWidthIn, bestNesting.sheetHeightIn);
  const sheetCost = gaugeData.sheets[sheetKey] ?? 0;
  const materialCost = bestNesting.sheetsNeeded * sheetCost;

  const laserCost = parsedDxf.totalCutLength * quantity * gaugeData.cut_rate_per_inch;

  const bendCost = hasBending
    ? numberOfBends * quantity * pricingData.bend_cost_per_bend
    : 0;

  const setupFee = getSetupFee(pricingData, orderType, hasBending);

  const subtotal = materialCost + laserCost + bendCost + setupFee;
  const perUnit = subtotal / quantity;

  const rangeLow = perUnit * pricingData.estimate_range.low_multiplier;
  const rangeHigh = perUnit * pricingData.estimate_range.high_multiplier;
  const totalRangeLow = rangeLow * quantity;
  const totalRangeHigh = rangeHigh * quantity;

  return {
    materialCost: Math.round(materialCost * 100) / 100,
    laserCost: Math.round(laserCost * 100) / 100,
    bendCost: Math.round(bendCost * 100) / 100,
    setupFee,
    subtotal: Math.round(subtotal * 100) / 100,
    perUnit: Math.round(perUnit * 100) / 100,
    rangeLow: Math.round(rangeLow * 100) / 100,
    rangeHigh: Math.round(rangeHigh * 100) / 100,
    totalRangeLow: Math.round(totalRangeLow * 100) / 100,
    totalRangeHigh: Math.round(totalRangeHigh * 100) / 100,
    bestNesting,
    allNesting,
  };
}
