import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data);
    return qrCodeDataURL;
  } catch {
    throw new Error('Failed to generate QR code');
  }
}

export function generateTicketCode(): string {
  // SECURITY: Use crypto.randomBytes instead of Math.random for unpredictable codes
  const crypto = require('crypto');
  return `TICKET-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}