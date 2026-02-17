'use client';

import { useRef, useEffect } from 'react';
import type { DxfEntity } from '@/lib/types';

interface DxfPreviewProps {
  entities: DxfEntity[];
  width: number;
  height: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export default function DxfPreview({
  entities,
  width,
  height,
  canvasWidth = 400,
  canvasHeight = 300,
}: DxfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || entities.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Compute bounding box from entities
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const entity of entities) {
      const bounds = getEntityBounds(entity);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
      }
    }

    if (minX === Infinity) return;

    const dxfWidth = maxX - minX;
    const dxfHeight = maxY - minY;

    // Compute scale to fit canvas with padding
    const padding = 20;
    const availWidth = canvasWidth - 2 * padding;
    const availHeight = canvasHeight - 2 * padding;
    const scale = Math.min(availWidth / dxfWidth, availHeight / dxfHeight);

    // Center offset
    const offsetX = padding + (availWidth - dxfWidth * scale) / 2;
    const offsetY = padding + (availHeight - dxfHeight * scale) / 2;

    // Transform DXF coordinates to canvas coordinates
    const tx = (x: number) => offsetX + (x - minX) * scale;
    const ty = (y: number) => canvasHeight - (offsetY + (y - minY) * scale); // Flip Y

    // Clear and fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw entities
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const entity of entities) {
      drawEntity(ctx, entity, tx, ty, scale);
    }
  }, [entities, canvasWidth, canvasHeight]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border border-gray-200 rounded-lg bg-white w-full max-w-[400px]"
        style={{ aspectRatio: `${canvasWidth}/${canvasHeight}` }}
      />
      {width > 0 && height > 0 && (
        <p className="mt-2 text-sm text-gray-600 font-mono">
          {width.toFixed(2)}&quot; × {height.toFixed(2)}&quot;
        </p>
      )}
      <p className="mt-1 text-xs text-gray-400">
        Dimensions shown in inches. If your file uses millimeters, please note this in the special instructions field.
      </p>
    </div>
  );
}

function getEntityBounds(entity: DxfEntity) {
  const points: Array<{ x: number; y: number }> = [];

  switch (entity.type) {
    case 'LINE':
      if (entity.vertices && entity.vertices.length >= 2) {
        points.push(entity.vertices[0], entity.vertices[1]);
      }
      break;

    case 'CIRCLE': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = entity.radius ?? 0;
      points.push({ x: cx - r, y: cy - r }, { x: cx + r, y: cy + r });
      break;
    }

    case 'ARC': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = entity.radius ?? 0;
      points.push({ x: cx - r, y: cy - r }, { x: cx + r, y: cy + r });
      break;
    }

    case 'ELLIPSE': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const mx = entity.majorAxisEndPoint?.x ?? 1;
      const my = entity.majorAxisEndPoint?.y ?? 0;
      const a = Math.sqrt(mx * mx + my * my);
      const maxR = a;
      points.push({ x: cx - maxR, y: cy - maxR }, { x: cx + maxR, y: cy + maxR });
      break;
    }

    case 'LWPOLYLINE':
    case 'POLYLINE':
      for (const v of entity.vertices ?? []) {
        points.push({ x: v.x, y: v.y });
      }
      break;

    case 'SPLINE':
      for (const p of entity.controlPoints ?? entity.fitPoints ?? []) {
        points.push({ x: p.x, y: p.y });
      }
      break;
  }

  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map(p => p.x)),
    maxX: Math.max(...points.map(p => p.x)),
    minY: Math.min(...points.map(p => p.y)),
    maxY: Math.max(...points.map(p => p.y)),
  };
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: DxfEntity,
  tx: (x: number) => number,
  ty: (y: number) => number,
  scale: number
) {
  ctx.beginPath();

  switch (entity.type) {
    case 'LINE': {
      const verts = entity.vertices;
      if (verts && verts.length >= 2) {
        ctx.moveTo(tx(verts[0].x), ty(verts[0].y));
        ctx.lineTo(tx(verts[1].x), ty(verts[1].y));
      }
      break;
    }

    case 'CIRCLE': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = (entity.radius ?? 0) * scale;
      ctx.arc(tx(cx), ty(cy), r, 0, 2 * Math.PI);
      break;
    }

    case 'ARC': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = (entity.radius ?? 0) * scale;
      const startAngle = ((entity.startAngle ?? 0) * Math.PI) / 180;
      const endAngle = ((entity.endAngle ?? 0) * Math.PI) / 180;
      // Canvas Y is flipped, so negate angles
      ctx.arc(tx(cx), ty(cy), r, -startAngle, -endAngle, true);
      break;
    }

    case 'ELLIPSE': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const mx = entity.majorAxisEndPoint?.x ?? 1;
      const my = entity.majorAxisEndPoint?.y ?? 0;
      const a = Math.sqrt(mx * mx + my * my) * scale;
      const b = a * (entity.axisRatio ?? 1);
      const rotation = Math.atan2(my, mx);
      ctx.ellipse(tx(cx), ty(cy), a, b, -rotation, 0, 2 * Math.PI);
      break;
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const verts = entity.vertices ?? [];
      if (verts.length < 2) break;
      ctx.moveTo(tx(verts[0].x), ty(verts[0].y));
      for (let i = 0; i < verts.length - 1; i++) {
        const v1 = verts[i];
        const v2 = verts[i + 1];
        if (v1.bulge && v1.bulge !== 0) {
          drawBulgeArc(ctx, tx, ty, scale, v1, v2, v1.bulge);
        } else {
          ctx.lineTo(tx(v2.x), ty(v2.y));
        }
      }
      if (entity.shape === true || entity.closed === true) {
        const last = verts[verts.length - 1];
        const first = verts[0];
        if (last.bulge && last.bulge !== 0) {
          drawBulgeArc(ctx, ty, tx, scale, last, first, last.bulge);
        } else {
          ctx.lineTo(tx(first.x), ty(first.y));
        }
      }
      break;
    }

    case 'SPLINE': {
      const pts = entity.controlPoints ?? entity.fitPoints ?? [];
      if (pts.length < 2) break;
      ctx.moveTo(tx(pts[0].x), ty(pts[0].y));
      if (pts.length === 2) {
        ctx.lineTo(tx(pts[1].x), ty(pts[1].y));
      } else {
        // Use quadratic curves for smooth approximation
        for (let i = 1; i < pts.length - 1; i++) {
          const cpx = tx(pts[i].x);
          const cpy = ty(pts[i].y);
          const nx = tx((pts[i].x + pts[i + 1].x) / 2);
          const ny = ty((pts[i].y + pts[i + 1].y) / 2);
          ctx.quadraticCurveTo(cpx, cpy, nx, ny);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(tx(last.x), ty(last.y));
      }
      break;
    }
  }

  ctx.stroke();
}

function drawBulgeArc(
  ctx: CanvasRenderingContext2D,
  tx: (x: number) => number,
  ty: (y: number) => number,
  scale: number,
  v1: { x: number; y: number; bulge?: number },
  v2: { x: number; y: number },
  bulge: number
) {
  // Calculate arc from bulge
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const s = Math.abs(bulge);
  const radius = (d * (1 + s * s)) / (4 * s);
  const angle = 2 * Math.atan(s);

  // Find center of arc
  const midX = (v1.x + v2.x) / 2;
  const midY = (v1.y + v2.y) / 2;
  const h = radius * Math.cos(angle);
  const perpX = -dy / d;
  const perpY = dx / d;

  const sign = bulge > 0 ? 1 : -1;
  const cx = midX + sign * perpX * h;
  const cy = midY + sign * perpY * h;

  const startAngle = Math.atan2(v1.y - cy, v1.x - cx);
  const endAngle = Math.atan2(v2.y - cy, v2.x - cx);

  ctx.arc(tx(cx), ty(cy), radius * scale, -startAngle, -endAngle, bulge > 0);
}
