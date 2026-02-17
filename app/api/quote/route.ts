import { NextRequest, NextResponse } from 'next/server';
import { parseDxfContent } from '@/lib/dxf-parser';
import { calculateEstimate } from '@/lib/pricing';
import { sendCustomerConfirmation, sendInternalNotification } from '@/lib/email';
import type { QuoteSubmission, QuoteResponse, PricingData, ParsedDxf } from '@/lib/types';
import pricingDataJson from '@/data/pricing.json';

const pricingData = pricingDataJson as PricingData;

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please try again later.' } satisfies QuoteResponse,
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as QuoteSubmission;

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Name is required' } satisfies QuoteResponse,
        { status: 400 }
      );
    }
    if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { success: false, message: 'A valid email is required' } satisfies QuoteResponse,
        { status: 400 }
      );
    }
    if (!body.dxfBase64 || !body.dxfFileName) {
      return NextResponse.json(
        { success: false, message: 'DXF file is required' } satisfies QuoteResponse,
        { status: 400 }
      );
    }
    if (!body.material || !body.gauge) {
      return NextResponse.json(
        { success: false, message: 'Material and gauge are required' } satisfies QuoteResponse,
        { status: 400 }
      );
    }
    if (!body.quantity || body.quantity < 1) {
      return NextResponse.json(
        { success: false, message: 'Quantity must be at least 1' } satisfies QuoteResponse,
        { status: 400 }
      );
    }

    // Re-parse DXF server-side for accurate measurements
    let serverParsedDxf: ParsedDxf | null = null;
    try {
      const dxfBuffer = Buffer.from(body.dxfBase64, 'base64');
      const dxfText = dxfBuffer.toString('utf-8');
      const parsed = parseDxfContent(dxfText);
      if (parsed.boundingBox.width > 0 && parsed.boundingBox.height > 0) {
        serverParsedDxf = parsed;
      }
    } catch (parseError) {
      console.error('Server-side DXF parse error:', parseError);
    }

    // Use server-parsed DXF if available, else fall back to client-parsed
    const effectiveDxf = serverParsedDxf ?? body.parsedDxf;
    let estimate = null;
    let manualReview = false;

    if (effectiveDxf && effectiveDxf.boundingBox.width > 0 && effectiveDxf.boundingBox.height > 0) {
      try {
        estimate = calculateEstimate(
          effectiveDxf,
          body.material,
          body.gauge,
          body.quantity,
          body.hasBending,
          body.hasBending ? body.numberOfBends : 0,
          body.orderType,
          pricingData
        );
      } catch (pricingError) {
        console.error('Pricing calculation error:', pricingError);
        manualReview = true;
      }
    } else {
      manualReview = true;
    }

    // Send emails (don't block response on email failures)
    const submission: QuoteSubmission = {
      dxfBase64: body.dxfBase64,
      dxfFileName: body.dxfFileName,
      parsedDxf: effectiveDxf,
      material: body.material,
      gauge: body.gauge,
      quantity: body.quantity,
      hasBending: body.hasBending,
      numberOfBends: body.hasBending ? body.numberOfBends : 0,
      orderType: body.orderType,
      name: body.name.trim(),
      email: body.email.trim(),
      company: body.company?.trim() ?? '',
      phone: body.phone?.trim() ?? '',
      notes: body.notes?.trim() ?? '',
    };

    // Fire and log — don't fail the response if email fails
    Promise.all([
      sendCustomerConfirmation(submission, estimate).catch(err =>
        console.error('Customer email error:', err)
      ),
      sendInternalNotification(submission, estimate, effectiveDxf).catch(err =>
        console.error('Internal email error:', err)
      ),
    ]);

    const response: QuoteResponse = {
      success: true,
      estimate: estimate ?? undefined,
      message: manualReview
        ? 'Your quote request has been received. Our team will review your file and provide a detailed quote.'
        : 'Your quote request has been received!',
      manualReview,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred. Please try again.' } satisfies QuoteResponse,
      { status: 500 }
    );
  }
}
