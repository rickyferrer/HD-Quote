'use client';

import DxfPreview from './DxfPreview';
import type { QuoteEstimate, ParsedDxf } from '@/lib/types';

interface EstimateResultProps {
  estimate: QuoteEstimate | null;
  parsedDxf: ParsedDxf | null;
  material: string;
  gauge: string;
  quantity: number;
  email: string;
  manualReview?: boolean;
  livePricing?: {
    active: boolean;
    asOfDate?: string;
    source?: string;
  };
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function EstimateResult({
  estimate,
  parsedDxf,
  material,
  gauge,
  quantity,
  email,
  manualReview,
  livePricing,
}: EstimateResultProps) {
  return (
    <div className="space-y-8">
      {/* Success header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Quote Request Received</h2>
      </div>

      {/* Part preview (thumbnail) */}
      {parsedDxf && parsedDxf.boundingBox.width > 0 && (
        <div className="flex justify-center">
          <div className="bg-white rounded-lg border border-gray-200 p-4 inline-block">
            <DxfPreview
              entities={parsedDxf.entities}
              width={parsedDxf.boundingBox.width}
              height={parsedDxf.boundingBox.height}
              canvasWidth={240}
              canvasHeight={180}
            />
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
            <span className="text-gray-500">Material: </span>
            <span className="font-semibold text-gray-800">{material} {gauge}</span>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
            <span className="text-gray-500">Quantity: </span>
            <span className="font-semibold text-gray-800">{quantity}</span>
          </div>
        </div>
      </div>

      {/* Price estimate */}
      {estimate && !manualReview ? (
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] rounded-xl p-8 text-center text-white">
          <p className="text-blue-200 text-sm mb-2">Estimated Price Range</p>
          <p className="text-4xl font-bold mb-2">
            {formatCurrency(estimate.rangeLow)} &ndash; {formatCurrency(estimate.rangeHigh)}
          </p>
          <p className="text-blue-200 text-lg">per unit</p>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-blue-100 text-sm">Total Estimate</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(estimate.totalRangeLow)} &ndash;{' '}
              {formatCurrency(estimate.totalRangeHigh)}
            </p>
          </div>
          {livePricing?.active && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-blue-200">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live market pricing as of {livePricing.asOfDate}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-blue-800 font-medium">
            Our team will review your file and provide a detailed quote.
          </p>
        </div>
      )}

      {/* Info message */}
      <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-600 leading-relaxed">
        This is a preliminary estimate based on your file and specifications. A member of our team
        will review your project and send a confirmed quote, typically within a few hours.
      </div>

      {/* Confirmation checkmarks */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-green-700">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Quote request received</span>
        </div>
        <div className="flex items-center gap-3 text-green-700">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Confirmation sent to {email}</span>
        </div>
      </div>
    </div>
  );
}
