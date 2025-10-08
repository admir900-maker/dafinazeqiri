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
  return `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}