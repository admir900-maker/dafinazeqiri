import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Email client not configured', email: null }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const mailbox = searchParams.get('mailbox') || 'INBOX';
    const uidParam = searchParams.get('uid');
    const uid = uidParam ? parseInt(uidParam, 10) : NaN;
    if (!Number.isFinite(uid)) {
      return NextResponse.json({ success: false, error: 'Missing uid' }, { status: 400 });
    }

    const imapConfig = {
      user: process.env.IMAP_USER || '',
      password: process.env.IMAP_PASSWORD || '',
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 10000,
    };

    const email = await new Promise<any>((resolve, reject) => {
      const imap = new Imap(imapConfig);

      imap.once('ready', () => {
        imap.openBox(mailbox, true, (err) => {
          if (err) return reject(err);

          const fetch = (imap as any).fetch(uid, { bodies: '', struct: true, uid: true } as any);
          let buffer = '';

          fetch.on('message', (msg: any) => {
            msg.on('body', (stream: any) => {
              stream.on('data', (chunk: any) => { buffer += chunk.toString('utf8'); });
            });
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                const getAddressText = (addr: any): string => {
                  if (!addr) return '';
                  if (typeof addr === 'string') return addr;
                  if (addr.text) return addr.text;
                  if (Array.isArray(addr)) return addr.map((a) => a.text || '').filter(Boolean).join(', ');
                  return '';
                };
                const attachmentsMeta = (parsed.attachments || []).map((a: any, idx: number) => ({
                  index: idx,
                  filename: a.filename || `attachment-${idx}`,
                  contentType: a.contentType || 'application/octet-stream',
                  size: a.size || (a.content ? (a.content.length || 0) : 0),
                  cid: a.cid || a.contentId || undefined,
                }));

                resolve({
                  from: getAddressText(parsed.from) || 'Unknown',
                  to: getAddressText(parsed.to) || '',
                  subject: parsed.subject || '(No Subject)',
                  date: parsed.date?.toISOString?.() || new Date().toISOString(),
                  body: parsed.text || '',
                  html: parsed.html || undefined,
                  messageId: parsed.messageId || String(uid),
                  inReplyTo: parsed.inReplyTo || undefined,
                  references: Array.isArray(parsed.references) ? parsed.references.join(',') : parsed.references || undefined,
                  attachments: attachmentsMeta,
                });
              } catch (e) {
                reject(e);
              }
            });
          });

          fetch.once('error', reject);
          fetch.once('end', () => { try { imap.end(); } catch { } });
        });
      });

      imap.once('error', reject);
      try { imap.connect(); } catch (e) { reject(e); }
    });

    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    console.error('Error fetching message:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch message', email: null });
  }
}
