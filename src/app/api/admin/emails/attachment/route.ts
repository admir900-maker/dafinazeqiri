import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
    const mailbox = searchParams.get('mailbox') || 'INBOX';
    const uidParam = searchParams.get('uid');
    const idxParam = searchParams.get('index');
  const inlineParam = searchParams.get('inline');
  const dispositionParam = searchParams.get('disposition');
    const uid = uidParam ? parseInt(uidParam, 10) : NaN;
    const index = idxParam ? parseInt(idxParam, 10) : NaN;

    if (!Number.isFinite(uid) || !Number.isFinite(index)) {
      return NextResponse.json({ success: false, error: 'Missing uid or index' }, { status: 400 });
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

    const { content, filename, contentType } = await new Promise<any>((resolve, reject) => {
      const imap = new Imap(imapConfig);
      let buffer = '';

      imap.once('ready', () => {
        imap.openBox(mailbox, true, (err) => {
          if (err) return reject(err);
          const fetch = (imap as any).fetch(uid, { bodies: '', struct: true, uid: true } as any);
          fetch.on('message', (msg: any) => {
            msg.on('body', (stream: any) => {
              stream.on('data', (chunk: any) => { buffer += chunk.toString('utf8'); });
            });
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                const att = (parsed.attachments || [])[index];
                if (!att) return reject(new Error('Attachment not found'));
                resolve({
                  content: att.content, // Buffer
                  filename: att.filename || `attachment-${index}`,
                  contentType: att.contentType || 'application/octet-stream',
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

  const headers = new Headers();
    headers.set('Content-Type', contentType);
  const isInline = dispositionParam === 'inline' || inlineParam === '1' || (inlineParam || '').toLowerCase() === 'true';
  headers.set('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${filename}"`);

    return new NextResponse(content, { status: 200, headers });
  } catch (error: any) {
    console.error('Error sending attachment:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to download attachment' }, { status: 500 });
  }
}
