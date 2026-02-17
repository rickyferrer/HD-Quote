'use client';

import { useEffect } from 'react';
import type { MaterialOption, OrderType } from '@/lib/types';

interface PartConfiguratorProps {
  materials: MaterialOption[];
  material: string;
  gauge: string;
  quantity: number;
  hasBending: boolean;
  numberOfBends: number;
  orderType: OrderType;
  onMaterialChange: (material: string) => void;
  onGaugeChange: (gauge: string) => void;
  onQuantityChange: (quantity: number) => void;
  onHasBendingChange: (hasBending: boolean) => void;
  onNumberOfBendsChange: (numberOfBends: number) => void;
  onOrderTypeChange: (orderType: OrderType) => void;
}

export default function PartConfigurator({
  materials,
  material,
  gauge,
  quantity,
  hasBending,
  numberOfBends,
  orderType,
  onMaterialChange,
  onGaugeChange,
  onQuantityChange,
  onHasBendingChange,
  onNumberOfBendsChange,
  onOrderTypeChange,
}: PartConfiguratorProps) {
  const selectedMaterial = materials.find(m => m.name === material);
  const gaugeOptions = selectedMaterial?.gauges ?? [];

  // Reset gauge when material changes if current gauge isn't valid
  useEffect(() => {
    if (selectedMaterial && !selectedMaterial.gauges.find(g => g.label === gauge)) {
      onGaugeChange(selectedMaterial.gauges[0]?.label ?? '');
    }
  }, [material, selectedMaterial, gauge, onGaugeChange]);

  return (
    <div className="space-y-6">
      {/* Material */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
        <select
          value={material}
          onChange={e => onMaterialChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
        >
          {materials.map(m => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Gauge/Thickness */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gauge / Thickness
        </label>
        <select
          value={gauge}
          onChange={e => onGaugeChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
        >
          {gaugeOptions.map(g => (
            <option key={g.label} value={g.label}>
              {g.label} ({g.thickness_in}&quot;)
            </option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={e => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
        />
      </div>

      {/* Bending Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Does this part require bending?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onHasBendingChange(false)}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
              !hasBending
                ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => onHasBendingChange(true)}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
              hasBending
                ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            Yes
          </button>
        </div>
      </div>

      {/* Number of Bends */}
      {hasBending && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How many bends?
          </label>
          <input
            type="number"
            min={1}
            value={numberOfBends}
            onChange={e =>
              onNumberOfBendsChange(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
          />
        </div>
      )}

      {/* Order Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Is this a new part or a re-order?
        </label>
        <div className="space-y-3">
          <label
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
              orderType === 'new'
                ? 'border-[#1e3a5f] bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="orderType"
              value="new"
              checked={orderType === 'new'}
              onChange={() => onOrderTypeChange('new')}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                orderType === 'new' ? 'border-[#1e3a5f]' : 'border-gray-400'
              }`}
            >
              {orderType === 'new' && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a5f]" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-800">New part (first run)</p>
              <p className="text-sm text-gray-500">Setup required for tooling</p>
            </div>
          </label>
          <label
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
              orderType === 'repeat'
                ? 'border-[#1e3a5f] bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="orderType"
              value="repeat"
              checked={orderType === 'repeat'}
              onChange={() => onOrderTypeChange('repeat')}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                orderType === 'repeat' ? 'border-[#1e3a5f]' : 'border-gray-400'
              }`}
            >
              {orderType === 'repeat' && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a5f]" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-800">Repeat order</p>
              <p className="text-sm text-gray-500">We&apos;ve made this part before</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
