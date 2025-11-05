import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Imap from 'imap';

interface MailboxInfo {
  name: string;
  path: string;
  delimiter: string;
  attribs: string[];
}

function flattenBoxes(boxes: any, prefix = '', delim = '/'): MailboxInfo[] {
  const result: MailboxInfo[] = [];
  for (const name of Object.keys(boxes || {})) {
    const box = boxes[name];
    const path = prefix ? `${prefix}${delim}${name}` : name;
    result.push({
      name,
      path,
      delimiter: box.delim || delim || '/',
      attribs: Array.isArray(box.attribs) ? box.attribs : [],
    });
    if (box.children) {
      result.push(...flattenBoxes(box.children, path, box.delim || delim || '/'));
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Email client not configured', mailboxes: [] }, { status: 200 });
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

    const imap = new Imap(imapConfig);

    const mailboxes: MailboxInfo[] = await new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.getBoxes((err, boxes) => {
          if (err) return reject(err);
          try {
            const flat = flattenBoxes(boxes);
            resolve(flat);
          } catch (e) {
            reject(e);
          } finally {
            try { imap.end(); } catch { }
          }
        });
      });
      imap.once('error', reject);
      try { imap.connect(); } catch (e) { reject(e); }
    });

    // Try to put common system boxes first
    const order = ['INBOX', 'Sent', 'Drafts', 'Spam', 'Trash', 'Archive'];
    const sorted = [...mailboxes].sort((a, b) => {
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.path.localeCompare(b.path);
    });

    return NextResponse.json({ success: true, mailboxes: sorted, count: sorted.length });
  } catch (error: any) {
    console.error('Error listing mailboxes:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to list mailboxes', mailboxes: [] });
  }
}
