// TypeScript interfaces for HD Sheet Metal Quoting App

export interface SheetPrices {
  '48x120': number;
  '60x120': number;
  '48x96': number;
  '60x96': number;
  [key: string]: number;
}

export interface GaugeOption {
  label: string;
  thickness_in: number;
  sheets: SheetPrices;
  cut_rate_per_inch: number;
}

export interface MaterialOption {
  name: string;
  gauges: GaugeOption[];
}

export interface SetupFees {
  new_part_no_bending: number;
  new_part_with_bending: number;
  repeat_no_bending: number;
  repeat_with_bending: number;
}

export interface SheetSize {
  label: string;
  width: number;
  height: number;
}

export interface NestingConfig {
  kerf_spacing_inches: number;
  sheet_sizes: SheetSize[];
}

export interface EstimateRange {
  low_multiplier: number;
  high_multiplier: number;
}

export interface CommodityConfig {
  symbol: string;
  baseline_usd_per_lb: number;
  sensitivity: number;
}

export interface PricingData {
  _comment?: string;
  materials: MaterialOption[];
  bend_cost_per_bend: number;
  setup_fees: SetupFees;
  nesting: NestingConfig;
  estimate_range: EstimateRange;
  commodity_config?: Record<string, CommodityConfig>;
}

// Live metal pricing types

export interface MetalPriceCache {
  result: LivePriceResult;
  fetchedAt: number;
}

export interface LivePriceResult {
  /** Per-material multiplier to apply to sheet prices */
  adjustments: Record<string, number>;
  /** Spot price in USD/lb per material (for display) */
  spotPrices: Record<string, number>;
  /** Date the prices reflect (YYYY-MM-DD) */
  asOfDate: string;
  /** Data source attribution */
  source: string;
}

// DXF-related types

export interface DxfEntity {
  type: string;
  vertices?: Array<{ x: number; y: number; bulge?: number }>;
  startAngle?: number;
  endAngle?: number;
  center?: { x: number; y: number };
  radius?: number;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ParsedDxf {
  boundingBox: {
    width: number;
    height: number;
  };
  totalCutLength: number;
  perimeterLength: number;
  interiorCutCount: number;
  interiorCutLength: number;
  entities: DxfEntity[];
}

// Nesting types

export interface NestingResult {
  sheetSize: string;
  sheetWidthIn: number;
  sheetHeightIn: number;
  partsPerSheet: number;
  sheetsNeeded: number;
  utilization: number;
  partsAcross: number;
  partsDown: number;
  orientation: '0°' | '90°';
}

// Pricing types

export interface QuoteEstimate {
  materialCost: number;
  laserCost: number;
  bendCost: number;
  setupFee: number;
  subtotal: number;
  perUnit: number;
  rangeLow: number;
  rangeHigh: number;
  totalRangeLow: number;
  totalRangeHigh: number;
  bestNesting: NestingResult;
  allNesting: NestingResult[];
}

// Form data types

export type OrderType = 'new' | 'repeat';

export interface QuoteFormData {
  // File
  dxfFile: File | null;
  dxfBase64: string;
  dxfFileName: string;
  parsedDxf: ParsedDxf | null;

  // Configuration
  material: string;
  gauge: string;
  quantity: number;
  hasBending: boolean;
  numberOfBends: number;
  orderType: OrderType;

  // Contact
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
}

export interface QuoteSubmission {
  dxfBase64: string;
  dxfFileName: string;
  parsedDxf: ParsedDxf | null;
  material: string;
  gauge: string;
  quantity: number;
  hasBending: boolean;
  numberOfBends: number;
  orderType: OrderType;
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
}

export interface QuoteResponse {
  success: boolean;
  estimate?: QuoteEstimate;
  message: string;
  manualReview?: boolean;
  livePricing?: {
    active: boolean;
    asOfDate?: string;
    source?: string;
  };
}
