import DxfParser from 'dxf-parser';
import type { ParsedDxf, DxfEntity } from './types';

interface RawDxfEntity {
  type: string;
  vertices?: Array<{ x: number; y: number; bulge?: number }>;
  startAngle?: number;
  endAngle?: number;
  center?: { x: number; y: number; z?: number };
  radius?: number;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  majorAxisEndPoint?: { x: number; y: number };
  axisRatio?: number;
  controlPoints?: Array<{ x: number; y: number }>;
  shape?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function arcLength(radius: number, startAngle: number, endAngle: number): number {
  let angle = endAngle - startAngle;
  if (angle < 0) angle += 2 * Math.PI;
  return Math.abs(radius * angle);
}

function bulgeArcLength(
  x1: number, y1: number,
  x2: number, y2: number,
  bulge: number
): number {
  const d = distance(x1, y1, x2, y2);
  const s = Math.abs(bulge);
  const radius = (d * (1 + s * s)) / (4 * s);
  const angle = 4 * Math.atan(s);
  return Math.abs(radius * angle);
}

function getEntityLength(entity: RawDxfEntity): number {
  switch (entity.type) {
    case 'LINE': {
      const x1 = entity.vertices?.[0]?.x ?? 0;
      const y1 = entity.vertices?.[0]?.y ?? 0;
      const x2 = entity.vertices?.[1]?.x ?? 0;
      const y2 = entity.vertices?.[1]?.y ?? 0;
      return distance(x1, y1, x2, y2);
    }

    case 'ARC': {
      const radius = entity.radius ?? 0;
      const startAngle = ((entity.startAngle ?? 0) * Math.PI) / 180;
      const endAngle = ((entity.endAngle ?? 0) * Math.PI) / 180;
      return arcLength(radius, startAngle, endAngle);
    }

    case 'CIRCLE': {
      const radius = entity.radius ?? 0;
      return 2 * Math.PI * radius;
    }

    case 'ELLIPSE': {
      const mx = entity.majorAxisEndPoint?.x ?? 1;
      const my = entity.majorAxisEndPoint?.y ?? 0;
      const a = Math.sqrt(mx * mx + my * my);
      const b = a * (entity.axisRatio ?? 1);
      // Ramanujan approximation for ellipse perimeter
      return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const verts = entity.vertices ?? [];
      if (verts.length < 2) return 0;
      let len = 0;
      for (let i = 0; i < verts.length - 1; i++) {
        const v1 = verts[i];
        const v2 = verts[i + 1];
        if (v1.bulge && v1.bulge !== 0) {
          len += bulgeArcLength(v1.x, v1.y, v2.x, v2.y, v1.bulge);
        } else {
          len += distance(v1.x, v1.y, v2.x, v2.y);
        }
      }
      // If closed (shape property), add closing segment
      if (entity.shape === true || (entity as RawDxfEntity).closed === true) {
        const first = verts[0];
        const last = verts[verts.length - 1];
        if (last.bulge && last.bulge !== 0) {
          len += bulgeArcLength(last.x, last.y, first.x, first.y, last.bulge);
        } else {
          len += distance(last.x, last.y, first.x, first.y);
        }
      }
      return len;
    }

    case 'SPLINE': {
      // Approximate spline by summing distances between control/fit points
      const pts = entity.controlPoints ?? entity.fitPoints ?? [];
      if (pts.length < 2) return 0;
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        len += distance(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      }
      return len;
    }

    default:
      return 0;
  }
}

function getEntityBounds(entity: RawDxfEntity): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const points: Array<{ x: number; y: number }> = [];

  switch (entity.type) {
    case 'LINE': {
      if (entity.vertices && entity.vertices.length >= 2) {
        points.push(entity.vertices[0], entity.vertices[1]);
      }
      break;
    }

    case 'CIRCLE': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = entity.radius ?? 0;
      points.push(
        { x: cx - r, y: cy - r },
        { x: cx + r, y: cy + r }
      );
      break;
    }

    case 'ARC': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const r = entity.radius ?? 0;
      const startDeg = entity.startAngle ?? 0;
      const endDeg = entity.endAngle ?? 360;
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;
      // Include start and end points
      points.push(
        { x: cx + r * Math.cos(startRad), y: cy + r * Math.sin(startRad) },
        { x: cx + r * Math.cos(endRad), y: cy + r * Math.sin(endRad) }
      );
      // Check cardinal directions within arc span
      const cardinals = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      for (const angle of cardinals) {
        let a = angle;
        let s = startRad;
        let e = endRad;
        // Normalize
        while (s < 0) { s += 2 * Math.PI; }
        while (e < 0) { e += 2 * Math.PI; }
        while (a < 0) { a += 2 * Math.PI; }
        if (e < s) e += 2 * Math.PI;
        if (a < s) a += 2 * Math.PI;
        if (a <= e) {
          points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
        }
      }
      break;
    }

    case 'ELLIPSE': {
      const cx = entity.center?.x ?? 0;
      const cy = entity.center?.y ?? 0;
      const mx = entity.majorAxisEndPoint?.x ?? 1;
      const my = entity.majorAxisEndPoint?.y ?? 0;
      const a = Math.sqrt(mx * mx + my * my);
      const b = a * (entity.axisRatio ?? 1);
      // Rough bounding box for any rotation
      const maxR = Math.max(a, b);
      points.push(
        { x: cx - maxR, y: cy - maxR },
        { x: cx + maxR, y: cy + maxR }
      );
      break;
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const verts = entity.vertices ?? [];
      for (const v of verts) {
        points.push({ x: v.x, y: v.y });
        // For bulge arcs, add approximate bounds
        if (v.bulge && v.bulge !== 0) {
          const idx = verts.indexOf(v);
          const next = verts[(idx + 1) % verts.length];
          if (next) {
            const midX = (v.x + next.x) / 2;
            const midY = (v.y + next.y) / 2;
            const d = distance(v.x, v.y, next.x, next.y);
            const sagitta = Math.abs(v.bulge) * d / 2;
            // Perpendicular offset direction
            const dx = next.x - v.x;
            const dy = next.y - v.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const sign = v.bulge > 0 ? 1 : -1;
            points.push({
              x: midX + sign * (-dy / len) * sagitta,
              y: midY + sign * (dx / len) * sagitta
            });
          }
        }
      }
      break;
    }

    case 'SPLINE': {
      const pts = entity.controlPoints ?? entity.fitPoints ?? [];
      for (const p of pts) {
        points.push({ x: p.x, y: p.y });
      }
      break;
    }

    default:
      return null;
  }

  if (points.length === 0) return null;

  return {
    minX: Math.min(...points.map(p => p.x)),
    maxX: Math.max(...points.map(p => p.x)),
    minY: Math.min(...points.map(p => p.y)),
    maxY: Math.max(...points.map(p => p.y)),
  };
}

function isEntityInterior(
  entity: RawDxfEntity,
  bbMinX: number, bbMinY: number,
  bbMaxX: number, bbMaxY: number,
  margin: number
): boolean {
  const bounds = getEntityBounds(entity);
  if (!bounds) return false;
  return (
    bounds.minX > bbMinX + margin &&
    bounds.minY > bbMinY + margin &&
    bounds.maxX < bbMaxX - margin &&
    bounds.maxY < bbMaxY - margin
  );
}

export function parseDxfContent(content: string): ParsedDxf {
  const parser = new DxfParser();
  const dxf = parser.parseSync(content);

  if (!dxf || !dxf.entities || dxf.entities.length === 0) {
    return {
      boundingBox: { width: 0, height: 0 },
      totalCutLength: 0,
      perimeterLength: 0,
      interiorCutCount: 0,
      interiorCutLength: 0,
      entities: [],
    };
  }

  const entities = dxf.entities as RawDxfEntity[];

  // Compute bounding box
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

  const width = maxX === -Infinity ? 0 : maxX - minX;
  const height = maxY === -Infinity ? 0 : maxY - minY;

  // Compute total cut length
  let totalCutLength = 0;
  for (const entity of entities) {
    totalCutLength += getEntityLength(entity);
  }

  // Identify interior cuts
  const margin = Math.min(width, height) * 0.02; // 2% margin for interior detection
  let interiorCutCount = 0;
  let interiorCutLength = 0;

  for (const entity of entities) {
    if (entity.type === 'CIRCLE') {
      interiorCutCount++;
      interiorCutLength += getEntityLength(entity);
    } else if (
      (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') &&
      (entity.shape === true || entity.closed === true) &&
      isEntityInterior(entity, minX, minY, maxX, maxY, margin)
    ) {
      interiorCutCount++;
      interiorCutLength += getEntityLength(entity);
    }
  }

  const perimeterLength = totalCutLength - interiorCutLength;

  return {
    boundingBox: { width, height },
    totalCutLength,
    perimeterLength,
    interiorCutCount,
    interiorCutLength,
    entities: entities as unknown as DxfEntity[],
  };
}

export function parseDxfFile(fileContent: string): ParsedDxf {
  return parseDxfContent(fileContent);
}
