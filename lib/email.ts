import type { QuoteEstimate, QuoteSubmission, ParsedDxf } from './types';

interface EmailResult {
  success: boolean;
  message: string;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function generateCustomerEmailHtml(
  submission: QuoteSubmission,
  estimate: QuoteEstimate | null
): string {
  const estimateSection = estimate
    ? `
      <div style="background-color: #f0f7f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">Estimated Range</p>
        <p style="font-size: 28px; font-weight: bold; color: #1e3a5f; margin: 0;">
          ${formatCurrency(estimate.rangeLow)} – ${formatCurrency(estimate.rangeHigh)} per unit
        </p>
        <p style="font-size: 16px; color: #444; margin: 8px 0 0 0;">
          Total: ${formatCurrency(estimate.totalRangeLow)} – ${formatCurrency(estimate.totalRangeHigh)}
        </p>
      </div>
    `
    : `
      <div style="background-color: #f0f7f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 16px; color: #444; margin: 0;">
          Our team will review your file and provide a detailed quote.
        </p>
      </div>
    `;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #1e3a5f;">
        <h1 style="color: #1e3a5f; font-size: 24px; margin: 0;">HD Sheet Metal &amp; Fabrication</h1>
      </div>

      <div style="padding: 30px 0;">
        <h2 style="color: #1e3a5f; font-size: 20px;">Thanks ${submission.name}, we've received your quote request.</h2>

        <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1e3a5f; font-size: 16px;">Order Summary</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="padding: 4px 0; color: #666;">Material:</td><td style="padding: 4px 0; font-weight: 500;">${submission.material}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Thickness:</td><td style="padding: 4px 0; font-weight: 500;">${submission.gauge}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Quantity:</td><td style="padding: 4px 0; font-weight: 500;">${submission.quantity}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Bending:</td><td style="padding: 4px 0; font-weight: 500;">${submission.hasBending ? `Yes (${submission.numberOfBends} bends)` : 'No'}</td></tr>
            <tr><td style="padding: 4px 0; color: #666;">Order Type:</td><td style="padding: 4px 0; font-weight: 500;">${submission.orderType === 'new' ? 'New Part' : 'Repeat Order'}</td></tr>
          </table>
        </div>

        ${estimateSection}

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          Our team is reviewing your project and will send a confirmed quote, typically within a few hours.
          If you have any questions, don't hesitate to reach out.
        </p>
      </div>

      <div style="border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
        <p style="margin: 0;">HD Sheet Metal &amp; Fabrication</p>
        <p style="margin: 4px 0;">quotes@hdmetalfab.com</p>
      </div>
    </body>
    </html>
  `;
}

function generateInternalEmailHtml(
  submission: QuoteSubmission,
  estimate: QuoteEstimate | null,
  parsedDxf: ParsedDxf | null
): string {
  const partAnalysis = parsedDxf && parsedDxf.boundingBox.width > 0
    ? `
      <h3 style="color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Part Analysis</h3>
      <table style="width: 100%; font-size: 14px; font-family: monospace;">
        <tr><td style="padding: 3px 0;">Bounding Box:</td><td>${parsedDxf.boundingBox.width.toFixed(3)}" × ${parsedDxf.boundingBox.height.toFixed(3)}"</td></tr>
        <tr><td style="padding: 3px 0;">Total Cut Length:</td><td>${parsedDxf.totalCutLength.toFixed(2)}"</td></tr>
        <tr><td style="padding: 3px 0;">Perimeter Length:</td><td>${parsedDxf.perimeterLength.toFixed(2)}"</td></tr>
        <tr><td style="padding: 3px 0;">Interior Cuts:</td><td>${parsedDxf.interiorCutCount} (${parsedDxf.interiorCutLength.toFixed(2)}")</td></tr>
      </table>
    `
    : '<p style="color: #c00;"><strong>Note:</strong> DXF could not be auto-parsed. Manual review required.</p>';

  const nestingSection = estimate
    ? `
      <h3 style="color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Nesting Analysis</h3>
      <table style="width: 100%; font-size: 14px; font-family: monospace; border-collapse: collapse;">
        <tr style="background: #f5f5f5;">
          <th style="text-align: left; padding: 6px;">Sheet</th>
          <th style="text-align: right; padding: 6px;">Parts/Sheet</th>
          <th style="text-align: right; padding: 6px;">Sheets</th>
          <th style="text-align: right; padding: 6px;">Utilization</th>
          <th style="text-align: right; padding: 6px;">Orient.</th>
        </tr>
        ${estimate.allNesting
          .filter(n => n.partsPerSheet > 0)
          .slice(0, 2)
          .map((n, i) => `
            <tr style="background: ${i === 0 ? '#e8f5e9' : '#fff'};">
              <td style="padding: 6px;">${n.sheetSize}${i === 0 ? ' ★' : ''}</td>
              <td style="text-align: right; padding: 6px;">${n.partsPerSheet} (${n.partsAcross}×${n.partsDown})</td>
              <td style="text-align: right; padding: 6px;">${n.sheetsNeeded}</td>
              <td style="text-align: right; padding: 6px;">${n.utilization.toFixed(1)}%</td>
              <td style="text-align: right; padding: 6px;">${n.orientation}</td>
            </tr>
          `)
          .join('')}
      </table>
    `
    : '';

  const costBreakdown = estimate
    ? `
      <h3 style="color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Cost Breakdown</h3>
      <table style="width: 100%; font-size: 14px; font-family: monospace;">
        <tr><td style="padding: 3px 0;">Material:</td><td style="text-align: right;">${formatCurrency(estimate.materialCost)}</td></tr>
        <tr><td style="padding: 3px 0;">Laser Cutting:</td><td style="text-align: right;">${formatCurrency(estimate.laserCost)}</td></tr>
        <tr><td style="padding: 3px 0;">Bending:</td><td style="text-align: right;">${formatCurrency(estimate.bendCost)}</td></tr>
        <tr><td style="padding: 3px 0;">Setup Fee:</td><td style="text-align: right;">${formatCurrency(estimate.setupFee)}</td></tr>
        <tr style="border-top: 2px solid #333; font-weight: bold;"><td style="padding: 6px 0;">Subtotal:</td><td style="text-align: right; padding: 6px 0;">${formatCurrency(estimate.subtotal)}</td></tr>
        <tr><td style="padding: 3px 0;">Per Unit:</td><td style="text-align: right;">${formatCurrency(estimate.perUnit)}</td></tr>
      </table>
      <div style="background: #fff3e0; padding: 12px; border-radius: 6px; margin-top: 12px;">
        <strong>Range shown to customer:</strong> ${formatCurrency(estimate.rangeLow)} – ${formatCurrency(estimate.rangeHigh)} per unit
        <br>
        <strong>Total range:</strong> ${formatCurrency(estimate.totalRangeLow)} – ${formatCurrency(estimate.totalRangeHigh)}
      </div>
    `
    : '<p style="color: #c00;"><strong>No auto-estimate generated.</strong> DXF requires manual review.</p>';

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; max-width: 700px; margin: 0 auto; padding: 20px; color: #333; font-size: 14px;">
      <h2 style="color: #1e3a5f; margin-bottom: 4px;">New Quote Request</h2>
      <p style="color: #666; margin-top: 0;">File: ${submission.dxfFileName}</p>

      <h3 style="color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Customer Info</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="padding: 3px 0; width: 120px;">Name:</td><td><strong>${submission.name}</strong></td></tr>
        <tr><td style="padding: 3px 0;">Email:</td><td>${submission.email}</td></tr>
        ${submission.company ? `<tr><td style="padding: 3px 0;">Company:</td><td>${submission.company}</td></tr>` : ''}
        ${submission.phone ? `<tr><td style="padding: 3px 0;">Phone:</td><td>${submission.phone}</td></tr>` : ''}
        ${submission.notes ? `<tr><td style="padding: 3px 0;">Notes:</td><td>${submission.notes}</td></tr>` : ''}
      </table>

      <h3 style="color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Order Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="padding: 3px 0; width: 120px;">Material:</td><td>${submission.material}</td></tr>
        <tr><td style="padding: 3px 0;">Gauge:</td><td>${submission.gauge}</td></tr>
        <tr><td style="padding: 3px 0;">Quantity:</td><td>${submission.quantity}</td></tr>
        <tr><td style="padding: 3px 0;">Bending:</td><td>${submission.hasBending ? `Yes (${submission.numberOfBends} bends)` : 'No'}</td></tr>
        <tr><td style="padding: 3px 0;">Order Type:</td><td>${submission.orderType === 'new' ? 'New Part (first run)' : 'Repeat Order'}</td></tr>
      </table>

      ${partAnalysis}
      ${nestingSection}
      ${costBreakdown}
    </body>
    </html>
  `;
}

async function sendWithResend(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: string }>
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'quotes@hdmetalfab.com';

  if (!apiKey || apiKey === 're_xxxxxxxxxxxx') {
    console.log('--- EMAIL (dev mode - no valid RESEND_API_KEY) ---');
    console.log(`To: ${to}`);
    console.log(`From: ${fromEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Attachments: ${attachments?.length ?? 0}`);
    console.log('HTML length:', html.length);
    console.log('--- END EMAIL ---');
    return { success: true, message: 'Email logged to console (dev mode)' };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
      })),
    });

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function sendCustomerConfirmation(
  submission: QuoteSubmission,
  estimate: QuoteEstimate | null
): Promise<EmailResult> {
  const html = generateCustomerEmailHtml(submission, estimate);
  return sendWithResend(
    submission.email,
    "HD Metal Fab — We've received your quote request",
    html
  );
}

export async function sendInternalNotification(
  submission: QuoteSubmission,
  estimate: QuoteEstimate | null,
  parsedDxf: ParsedDxf | null
): Promise<EmailResult> {
  const internalEmail = process.env.INTERNAL_EMAIL || 'quotes@hdmetalfab.com';
  const html = generateInternalEmailHtml(submission, estimate, parsedDxf);

  const subject = `New Quote Request — ${submission.name} — ${submission.material} ${submission.gauge} — Qty ${submission.quantity}`;

  const attachments = submission.dxfBase64
    ? [{ filename: submission.dxfFileName, content: submission.dxfBase64 }]
    : undefined;

  return sendWithResend(internalEmail, subject, html, attachments);
}
