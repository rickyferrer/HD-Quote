import type { SheetSize, NestingResult } from './types';

export function calculateNesting(
  partWidth: number,
  partHeight: number,
  quantity: number,
  sheetSizes: SheetSize[],
  kerfSpacing: number
): NestingResult[] {
  const results: NestingResult[] = [];

  const adjustedWidth = partWidth + kerfSpacing;
  const adjustedHeight = partHeight + kerfSpacing;

  for (const sheet of sheetSizes) {
    // Orientation 0°
    const partsAcross0 = Math.floor(sheet.width / adjustedWidth);
    const partsDown0 = Math.floor(sheet.height / adjustedHeight);
    const total0 = partsAcross0 * partsDown0;

    // Orientation 90°
    const partsAcross90 = Math.floor(sheet.width / adjustedHeight);
    const partsDown90 = Math.floor(sheet.height / adjustedWidth);
    const total90 = partsAcross90 * partsDown90;

    let partsPerSheet: number;
    let partsAcross: number;
    let partsDown: number;
    let orientation: '0°' | '90°';

    if (total0 >= total90) {
      partsPerSheet = total0;
      partsAcross = partsAcross0;
      partsDown = partsDown0;
      orientation = '0°';
    } else {
      partsPerSheet = total90;
      partsAcross = partsAcross90;
      partsDown = partsDown90;
      orientation = '90°';
    }

    if (partsPerSheet === 0) {
      // Part doesn't fit on this sheet at all
      results.push({
        sheetSize: sheet.label,
        sheetWidthIn: sheet.width,
        sheetHeightIn: sheet.height,
        partsPerSheet: 0,
        sheetsNeeded: 0,
        utilization: 0,
        partsAcross: 0,
        partsDown: 0,
        orientation: '0°',
      });
      continue;
    }

    const sheetsNeeded = Math.ceil(quantity / partsPerSheet);
    const utilization =
      ((partsPerSheet * partWidth * partHeight) /
        (sheet.width * sheet.height)) *
      100;

    results.push({
      sheetSize: sheet.label,
      sheetWidthIn: sheet.width,
      sheetHeightIn: sheet.height,
      partsPerSheet,
      sheetsNeeded,
      utilization: Math.round(utilization * 100) / 100,
      partsAcross,
      partsDown,
      orientation,
    });
  }

  // Sort by utilization descending
  results.sort((a, b) => b.utilization - a.utilization);

  return results;
}
