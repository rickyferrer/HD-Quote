'use client';

import { useState, useCallback, useRef } from 'react';
import DxfPreview from './DxfPreview';
import type { ParsedDxf } from '@/lib/types';
import { parseDxfContent } from '@/lib/dxf-parser';

interface DxfUploaderProps {
  onFileLoaded: (file: File, base64: string, parsed: ParsedDxf | null) => void;
  parsedDxf: ParsedDxf | null;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export default function DxfUploader({ onFileLoaded, parsedDxf }: DxfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      setParseError(false);

      if (!file.name.toLowerCase().endsWith('.dxf')) {
        setError('Please upload a .dxf file');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('File size exceeds 25MB limit. Please upload a smaller file.');
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;

        // Convert to base64
        const base64Reader = new FileReader();
        base64Reader.onload = (be) => {
          const base64 = (be.target?.result as string).split(',')[1] || '';

          try {
            const parsed = parseDxfContent(text);
            if (parsed.boundingBox.width === 0 || parsed.boundingBox.height === 0) {
              setParseError(true);
              onFileLoaded(file, base64, null);
            } else {
              onFileLoaded(file, base64, parsed);
            }
          } catch {
            setParseError(true);
            onFileLoaded(file, base64, null);
          }
        };
        base64Reader.readAsDataURL(file);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#1e3a5f] bg-blue-50'
            : fileName
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-[#1e3a5f] hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf"
          onChange={handleFileChange}
          className="hidden"
        />
        {fileName ? (
          <div>
            <svg
              className="w-12 h-12 mx-auto text-green-500 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-800">{fileName}</p>
            <p className="text-sm text-gray-500 mt-1">Click or drag to replace</p>
          </div>
        ) : (
          <div>
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg font-medium text-gray-700">
              Drag and drop your DXF file here
            </p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 mt-3">
              Accepts .dxf files up to 25MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {parseError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
          We couldn&apos;t automatically analyze this file. Please submit your request and our team
          will review it manually.
        </div>
      )}

      {parsedDxf && parsedDxf.boundingBox.width > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Part Preview</h3>
          <DxfPreview
            entities={parsedDxf.entities}
            width={parsedDxf.boundingBox.width}
            height={parsedDxf.boundingBox.height}
          />
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Total Cut Length</span>
              <p className="font-semibold text-gray-800">
                {parsedDxf.totalCutLength.toFixed(2)}&quot;
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Interior Cuts</span>
              <p className="font-semibold text-gray-800">{parsedDxf.interiorCutCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
