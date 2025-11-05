import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Imap from 'imap';

interface EmailHeader {
  id: string; // seqno fallback
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
  messageId: string;
  inReplyTo?: string;
  references?: string;
}

function hasAttachment(struct: any): boolean {
  if (!struct) return false;
  const stack = Array.isArray(struct) ? [...struct] : [struct];
  while (stack.length) {
    const part = stack.pop();
    if (!part) continue;
    if (Array.isArray(part)) {
      for (const p of part) stack.push(p);
      continue;
    }
    const disp = part.disposition || part.dispositionParameters;
    if (part.disposition && String(part.disposition.type).toLowerCase() === 'attachment') return true;
    if (part.params && part.params.name) return true;
    if (part.disposition && part.disposition.params && part.disposition.params.filename) return true;
    if (part.childNodes) stack.push(...part.childNodes);
    if (part.parts) stack.push(...part.parts);
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Email client not configured', emails: [] }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const mailbox = searchParams.get('mailbox') || 'INBOX';
    const limitRaw = (searchParams.get('limit') || '20').toLowerCase();
    const limitAll = limitRaw === 'all';
    const limitNum = parseInt(limitRaw, 10);
    const limit = limitAll ? 0 : (Number.isFinite(limitNum) ? Math.max(1, Math.min(2000, limitNum)) : 20);

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

    const emails: EmailHeader[] = await new Promise((resolve, reject) => {
      const imap = new Imap(imapConfig);

      imap.once('ready', () => {
        imap.openBox(mailbox, true, (err, box) => {
          if (err) return reject(err);

          if (!box || box.messages.total === 0) {
            try { imap.end(); } catch { }
            return resolve([]);
          }

          const fetchRange = limitAll
            ? `1:${box.messages.total}`
            : `${Math.max(1, box.messages.total - (limit - 1))}:${box.messages.total}`;

          const fetch = imap.seq.fetch(fetchRange, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)',
            struct: true
          });

          const results: Record<number, Partial<EmailHeader> & { _date?: Date }> = {};

          fetch.on('message', (msg, seqno) => {
            let headerBuf = '';
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => { headerBuf += chunk.toString('utf8'); });
              stream.once('end', () => {
                try {
                  const parsed = Imap.parseHeader(headerBuf);
                  const msgId = Array.isArray(parsed['message-id']) ? parsed['message-id'][0] : parsed['message-id'];
                  const dateStr = Array.isArray(parsed['date']) ? parsed['date'][0] : parsed['date'];
                  const subj = Array.isArray(parsed['subject']) ? parsed['subject'][0] : parsed['subject'];
                  const from = Array.isArray(parsed['from']) ? parsed['from'][0] : parsed['from'];
                  const to = Array.isArray(parsed['to']) ? parsed['to'][0] : parsed['to'];
                  const inReplyTo = Array.isArray(parsed['in-reply-to']) ? parsed['in-reply-to'][0] : parsed['in-reply-to'];
                  const references = Array.isArray(parsed['references']) ? parsed['references'].join(',') : parsed['references'];
                  results[seqno] = {
                    id: String(seqno),
                    from: from || 'Unknown',
                    to: to || '',
                    subject: subj || '(No Subject)',
                    date: dateStr || new Date().toISOString(),
                    messageId: msgId || String(seqno),
                    inReplyTo: inReplyTo || undefined,
                    references: references || undefined,
                  };
                } catch (e) {
                  // ignore header parse errors
                }
              });
            });
            msg.once('attributes', (attrs) => {
              const uid = attrs.uid;
              const flags: string[] = attrs.flags || [];
              const struct = attrs.struct;
              results[seqno] = {
                ...(results[seqno] || {}),
                uid,
                isRead: flags.includes('\\Seen'),
                hasAttachments: hasAttachment(struct),
              };
            });
          });

          fetch.once('error', (err) => reject(err));
          fetch.once('end', () => {
            try { imap.end(); } catch { }
            const list: EmailHeader[] = Object.keys(results)
              .map((k) => ({ ...(results[Number(k)] as any) }))
              .map((e) => ({
                id: e.id!,
                uid: e.uid || Number(e.id!),
                from: e.from || 'Unknown',
                to: e.to || '',
                subject: e.subject || '(No Subject)',
                date: e.date || new Date().toISOString(),
                messageId: e.messageId || e.id!,
                inReplyTo: e.inReplyTo,
                references: e.references,
                isRead: !!e.isRead,
                hasAttachments: !!e.hasAttachments,
              }))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            resolve(list);
          });
        });
      });

      imap.once('error', reject);
      try { imap.connect(); } catch (e) { reject(e); }
    });

    return NextResponse.json({ success: true, emails, count: emails.length, mailbox, limit: limitAll ? 'all' : limit });
  } catch (error: any) {
    console.error('Error fetching headers:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch headers', emails: [] });
  }
}
