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

    imap.once('ready', () => {
      console.log('IMAP connection ready');
      
      imap.openBox('INBOX', false, (err: Error | null, box: any) => {
        if (err) {
          console.error('Error opening INBOX:', err);
          reject(err);
          return;
        }

        console.log('INBOX opened, total messages:', box.messages.total);

        // If inbox is empty, return empty array
        if (box.messages.total === 0) {
          console.log('No messages in inbox');
          imap.end();
          resolve([]);
          return;
        }

        // Fetch last 50 emails
        const fetchRange = box.messages.total > 0
          ? `${Math.max(1, box.messages.total - 49)}:${box.messages.total}`
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
        });        fetch.once('error', (err: Error) => {
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
      reject(err);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended, found', emails.length, 'emails');
      // Sort by date descending (newest first)
      emails.sort((a, b) => b.date.getTime() - a.date.getTime());
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
