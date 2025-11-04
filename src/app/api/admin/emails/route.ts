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

// Function to fetch emails using IMAP
async function fetchEmails(): Promise<EmailMessage[]> {
  return new Promise((resolve, reject) => {
    const imapConfig = {
      user: process.env.IMAP_USER || '',
      password: process.env.IMAP_PASSWORD || '',
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    };

    const imap = new Imap(imapConfig);
    const emails: EmailMessage[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err: Error | null, box: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Fetch last 50 emails
        const fetchRange = box.messages.total > 0 
          ? `${Math.max(1, box.messages.total - 49)}:${box.messages.total}`
          : '1:1';

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
                
                emails.push({
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
                });
              } catch (error) {
                console.error('Error parsing email:', error);
              }
            });
          });
        });

        fetch.once('error', (err: Error) => {
          console.error('Fetch error:', err);
          reject(err);
        });

        fetch.once('end', () => {
          imap.end();
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('IMAP error:', err);
      reject(err);
    });

    imap.once('end', () => {
      // Sort by date descending (newest first)
      emails.sort((a, b) => b.date.getTime() - a.date.getTime());
      resolve(emails);
    });

    imap.connect();
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

    const emails = await fetchEmails();

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length
    });

  } catch (error: any) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch emails',
      emails: []
    });
  }
}
