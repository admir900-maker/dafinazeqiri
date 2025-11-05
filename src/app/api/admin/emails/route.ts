import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  body: string;
  html?: string;
  isRead: boolean;
  hasAttachments: boolean;
  messageId: string;
  inReplyTo?: string;
  references?: string;
}

// Simple in-memory cache per mailbox+limit to avoid re-fetching over IMAP on every request
type CacheKey = string; // `${mailbox}::${limit}`
type CacheEntry = { emails: EmailMessage[]; fetchedAt: number };
const emailCacheMap = new Map<CacheKey, CacheEntry>();
const inFlightMap = new Map<CacheKey, Promise<EmailMessage[]>>();

// Function to fetch emails using IMAP
async function fetchEmails(mailbox: string, limit: number): Promise<EmailMessage[]> {
  return new Promise((resolve, reject) => {
    const imapConfig = {
      user: process.env.IMAP_USER || '',
      password: process.env.IMAP_PASSWORD || '',
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 10000
    };

    console.log('IMAP Config:', {
      user: imapConfig.user,
      host: imapConfig.host,
      port: imapConfig.port,
      hasPassword: !!imapConfig.password
    });

    const imap = new Imap(imapConfig);
    const emails: EmailMessage[] = [];

    // Safety timer: if IMAP operations take too long, close the connection
    // Keep server total under client timeout; target ~50s
    const MAX_FETCH_MS = 50000; // 50s
    const safetyTimer = setTimeout(() => {
      console.warn('IMAP fetch taking too long, closing connection early');
      try { imap.end(); } catch (e) { }
    }, MAX_FETCH_MS);

    imap.once('ready', () => {
      console.log('IMAP connection ready');
      const boxName = mailbox || 'INBOX';
      imap.openBox(boxName, false, (err: Error | null, box: any) => {
        if (err) {
          console.error(`Error opening ${boxName}:`, err);
          reject(err);
          return;
        }

        console.log(`${boxName} opened, total messages:`, box.messages.total);

        // If inbox is empty, return empty array
        if (box.messages.total === 0) {
          console.log('No messages in inbox');
          imap.end();
          resolve([]);
          return;
        }

        // Fetch last N emails (keeps response fast). Increase if needed.
        const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20));
        const fetchRange = box.messages.total > 0
          ? `${Math.max(1, box.messages.total - (safeLimit - 1))}:${box.messages.total}`
          : '1:1';

        console.log('Fetching range:', fetchRange);

        const fetch = imap.seq.fetch(fetchRange, {
          bodies: '',
          struct: true
        });

        fetch.on('message', (msg: any, seqno: number) => {
          let buffer = '';

          msg.on('body', (stream: any) => {
            stream.on('data', (chunk: Buffer) => {
              buffer += chunk.toString('utf8');
            });

            stream.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);

                // Helper to extract text from AddressObject
                const getAddressText = (addr: any): string => {
                  if (!addr) return '';
                  if (typeof addr === 'string') return addr;
                  if (addr.text) return addr.text;
                  if (Array.isArray(addr) && addr[0]?.text) return addr[0].text;
                  return '';
                };

                const email: EmailMessage = {
                  id: `${seqno}`,
                  from: getAddressText(parsed.from) || 'Unknown',
                  to: getAddressText(parsed.to) || '',
                  subject: parsed.subject || '(No Subject)',
                  date: parsed.date || new Date(),
                  body: parsed.text || '',
                  html: parsed.html || undefined,
                  isRead: false,
                  hasAttachments: (parsed.attachments?.length || 0) > 0,
                  messageId: parsed.messageId || `${seqno}`,
                  inReplyTo: parsed.inReplyTo || undefined,
                  references: Array.isArray(parsed.references)
                    ? parsed.references.join(',')
                    : parsed.references || undefined
                };

                emails.push(email);
                console.log('Parsed email:', email.id, email.subject);
              } catch (error) {
                console.error('Error parsing email:', error);
              }
            });
          });
        }); fetch.once('error', (err: Error) => {
          console.error('Fetch error:', err);
          imap.end();
          reject(err);
        });

        fetch.once('end', () => {
          console.log('Fetch complete, closing IMAP connection');
          imap.end();
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('IMAP error:', err);
      try { clearTimeout(safetyTimer); } catch { }
      reject(err);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended, found', emails.length, 'emails');
      // Sort by date descending (newest first)
      emails.sort((a, b) => b.date.getTime() - a.date.getTime());
      try { clearTimeout(safetyTimer); } catch { }
      resolve(emails);
    });

    try {
      imap.connect();
    } catch (error) {
      console.error('IMAP connect error:', error);
      reject(error);
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check

    // Check if IMAP credentials are configured
    if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'Email client not configured. Please set IMAP credentials in environment variables.',
        emails: []
      });
    }

    // Respect query params
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === '1';
    const mailbox = searchParams.get('mailbox') || 'INBOX';
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 20;

    const cacheKey: CacheKey = `${mailbox}::${limit}`;

    // Serve from cache if fresh and not forcing refresh
    const now = Date.now();
    const cacheTTL = 2 * 60 * 1000; // 2 minutes
    const existing = emailCacheMap.get(cacheKey);
    if (!forceRefresh && existing && now - existing.fetchedAt < cacheTTL) {
      const response = {
        success: true,
        emails: existing.emails,
        count: existing.emails.length,
        cache: true,
        mailbox,
        limit,
      };
      console.log(`Returning cached emails for ${cacheKey}:`, response.count);
      return NextResponse.json(response);
    }

    // Deduplicate concurrent fetches per cacheKey
    if (!inFlightMap.has(cacheKey)) {
      inFlightMap.set(
        cacheKey,
        fetchEmails(mailbox, limit)
          .then((emails) => {
            emailCacheMap.set(cacheKey, { emails, fetchedAt: Date.now() });
            return emails;
          })
          .finally(() => {
            inFlightMap.delete(cacheKey);
          })
      );
    }

    const emails = await inFlightMap.get(cacheKey)!;

    const response = {
      success: true,
      emails,
      count: emails.length,
      cache: false,
      mailbox,
      limit,
    };

    console.log(`Returning response with ${response.count} emails for ${cacheKey}`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch emails',
      emails: []
    });
  }
}
