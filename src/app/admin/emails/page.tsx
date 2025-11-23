'use client';

import { useState, useEffect } from 'react';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import {
  Mail, Send, RefreshCw, Inbox, Star, Trash2, Search,
  ChevronLeft, Clock, User, Reply, Forward, MoreVertical,
  Archive, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';

interface Email {
  id: string;
  uid?: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  body?: string;
  html?: string;
  isRead: boolean;
  hasAttachments: boolean;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{
    index: number;
    filename: string;
    contentType: string;
    size: number;
    cid?: string;
  }>;
}

export default function EmailClientPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [mailboxes, setMailboxes] = useState<{ name: string; path: string }[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<string>('INBOX');
  const [limit, setLimit] = useState<string>('20');
  const [previewAttachmentIndex, setPreviewAttachmentIndex] = useState<number | null>(null);

  // Compose form state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching emails...');
      // Add a timeout so the UI doesn't spin forever on slow IMAP
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 75000); // 75s, allow server (50s) to complete
      const params = new URLSearchParams({ mailbox: selectedMailbox, limit });
      const response = await fetch(`/api/admin/emails/headers?${params.toString()}`, {
        // Ensure we always get fresh data and expect JSON
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Check if response is ok
      if (!response.ok) {
        const text = await response.text();
        console.error('API Error Response:', text);
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      console.log('Email fetch response:', data);
      console.log('Email headers response:', data);

      if (data.success) {
        setEmails(data.emails || []);
        if (data.emails.length === 0) {
          setError('Inbox is empty. No emails found.');
        }
      } else {
        setError(data.error || 'Failed to fetch emails');
      }
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      const aborted = error?.name === 'AbortError';
      // Surface the actual error so we can display useful guidance (e.g., Unauthorized)
      setError(
        aborted
          ? 'Mail server took too long to respond. Please click Refresh to try again.'
          : error?.message || 'Failed to fetch emails. Check console for details.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailBody = async (email: Email) => {
    try {
      if (!email || email.body) return; // already loaded
      const params = new URLSearchParams({ mailbox: selectedMailbox, uid: String(email.uid || email.id) });
      const res = await fetch(`/api/admin/emails/message?${params.toString()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const updated: Email = {
          ...email,
          body: data.email?.body || '',
          html: data.email?.html,
          attachments: data.email?.attachments || [],
        };
        setEmails((prev) => prev.map((e) => (e.id === email.id ? updated : e)));
        setSelectedEmail(updated);
      }
    } catch (e) {
      console.error('Failed to load email body', e);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [selectedMailbox, limit]);

  const fetchMailboxes = async () => {
    try {
      const res = await fetch('/api/admin/emails/mailboxes', { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setMailboxes(data.mailboxes || []);
        if (!data.mailboxes?.some((m: any) => m.path === selectedMailbox)) {
          setSelectedMailbox('INBOX');
        }
      }
    } catch (e) {
      console.error('Failed to load mailboxes', e);
    }
  };

  useEffect(() => {
    fetchMailboxes();
  }, []);

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSending(true);

      const payload: any = {
        to: composeTo,
        subject: composeSubject,
        body: composeBody
      };

      // If replying, add reply headers
      if (replyTo) {
        payload.inReplyTo = replyTo.messageId;
        payload.references = replyTo.references
          ? `${replyTo.references},${replyTo.messageId}`
          : replyTo.messageId;
      }

      const response = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        alert('Email sent successfully!');
        setShowCompose(false);
        setReplyTo(null);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        // Refresh emails
        fetchEmails();
      } else {
        alert(`Failed to send email: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleReply = (email: Email) => {
    setReplyTo(email);
    setShowCompose(true);

    // Extract email address from "Name <email>" format
    const emailMatch = email.from.match(/<(.+?)>/);
    const fromEmail = emailMatch ? emailMatch[1] : email.from;

    setComposeTo(fromEmail);
    setComposeSubject(`Re: ${email.subject.replace(/^Re:\s*/i, '')}`);
    setComposeBody(`\n\n--- Original Message ---\nFrom: ${email.from}\nDate: ${new Date(email.date).toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}`);
  };

  const handleCompose = () => {
    setReplyTo(null);
    setShowCompose(true);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getEmailPreview = (body: string, maxLength = 80) => {
    const plainText = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.from.toLowerCase().includes(query) ||
      email.subject.toLowerCase().includes(query) ||
      (email.body || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Client</h1>
          <p className="text-gray-600">Manage incoming emails and send replies</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCompose}
            className="bg-[#cd7f32] hover:bg-[#b4530a]"
          >
            <Send className="w-4 h-4 mr-2" />
            Compose
          </Button>
          <Button
            onClick={fetchEmails}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      {/* Tip: the first load can take up to ~60s while connecting to IMAP; subsequent loads are fast due to caching */}

      {/* Error / Guidance Panel */}
      {error && (
        <AdminCard>
          <AdminCardContent className="p-4">
            <div className="flex items-start gap-3 text-orange-400">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                {(() => {
                  const e = (error || '').toLowerCase();
                  const isUnauthorized = e.includes('unauthorized') || e.includes('401');
                  const isNotConfigured = e.includes('not configured') || e.includes('imap');
                  const title = isUnauthorized
                    ? 'Please sign in to view emails'
                    : isNotConfigured
                      ? 'Email Client Configuration Required'
                      : 'Unable to load emails';
                  return (
                    <>
                      <p className="font-semibold">{title}</p>
                      <p className="text-sm text-gray-700 mt-1 break-all">{error}</p>
                      {isUnauthorized ? (
                        <div className="mt-3">
                          <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <a href="/auth/signin">Go to Sign In</a>
                          </Button>
                        </div>
                      ) : isNotConfigured ? (
                        <p className="text-xs text-gray-600 mt-2">
                          Add IMAP credentials to your .env.local file and restart the server:<br />
                          IMAP_USER=your-email@domain.com<br />
                          IMAP_PASSWORD=your-password<br />
                          IMAP_HOST=imap.gmail.com (or your provider)<br />
                          IMAP_PORT=993
                        </p>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mailboxes + Email List Sidebar */}
        <div className="lg:col-span-4">
          <AdminCard>
            <AdminCardHeader>
              <div className="flex items-center justify-between gap-2">
                <AdminCardTitle className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-blue-400" />
                  {selectedMailbox} ({filteredEmails.length})
                </AdminCardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setLimit((prev) => {
                    if (prev === 'all') return 'all';
                    const n = parseInt(prev || '20', 10);
                    return String(Math.min(2000, n + 20));
                  })} disabled={loading}>
                    +20
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setLimit('20')} disabled={loading}>
                    Reset
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setLimit('all')} disabled={loading}>
                    All
                  </Button>
                </div>
              </div>
            </AdminCardHeader>
            <AdminCardContent className="p-0">
              {/* Mailboxes */}
              <div className="p-2 border-b border-gray-200 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1">
                  {mailboxes.map((mb) => (
                    <button
                      key={mb.path}
                      onClick={() => { setSelectedMailbox(mb.path); setSelectedEmail(null); setLimit('20'); }}
                      className={`text-left text-xs px-2 py-1 rounded ${selectedMailbox === mb.path ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {mb.path}
                    </button>
                  ))}
                </div>
              </div>
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Email List */}
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-600">
                    <Loader2 className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
                    <p>Fetching emails...</p>
                    <p className="text-xs text-gray-500 mt-2">First load may take up to a minute while connecting to the mail server.</p>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No emails found</p>
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => { setSelectedEmail(email); fetchEmailBody(email); }}
                      className={`p-4 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium text-sm truncate">
                            {email.from.split('<')[0].trim() || email.from}
                          </p>
                          <p className="text-gray-700 text-xs truncate">
                            {email.subject}
                          </p>
                        </div>
                        <span className="text-gray-500 text-xs ml-2 whitespace-nowrap">
                          {formatDate(email.date)}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs truncate">
                        {email.body ? getEmailPreview(email.body) : 'Open to view message'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </AdminCardContent>
          </AdminCard>
        </div>

        {/* Email Content / Compose */}
        <div className="lg:col-span-8">
          {showCompose ? (
            <AdminCard>
              <AdminCardHeader>
                <div className="flex items-center justify-between">
                  <AdminCardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-[#cd7f32]" />
                    {replyTo ? 'Reply to Email' : 'Compose New Email'}
                  </AdminCardTitle>
                  <Button
                    onClick={() => {
                      setShowCompose(false);
                      setReplyTo(null);
                    }}
                    variant="ghost"
                    className="text-gray-700 hover:text-gray-900"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </div>
              </AdminCardHeader>
              <AdminCardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2 font-medium">To</label>
                    <input
                      type="email"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="recipient@example.com"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm mb-2 font-medium">Subject</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Email subject"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm mb-2 font-medium">Message</label>
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Type your message here..."
                      rows={12}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <div className="text-gray-600 text-sm">
                      {replyTo && (
                        <span className="flex items-center gap-2">
                          <Reply className="w-4 h-4" />
                          Replying to: {replyTo.from.split('<')[0].trim()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setShowCompose(false);
                          setReplyTo(null);
                        }}
                        variant="ghost"
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSendEmail}
                        disabled={sending || !composeTo || !composeSubject || !composeBody}
                        className="bg-[#cd7f32] hover:bg-[#b4530a]"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Email
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </AdminCardContent>
            </AdminCard>
          ) : selectedEmail ? (
            <AdminCard>
              <AdminCardHeader>
                <div className="flex items-center justify-between">
                  <AdminCardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-400" />
                    Email Details
                  </AdminCardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReply(selectedEmail)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                    <Button
                      onClick={() => setSelectedEmail(null)}
                      variant="ghost"
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </AdminCardHeader>
              <AdminCardContent className="p-6">
                <div className="space-y-4">
                  {/* Email Header */}
                  <div className="pb-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      {selectedEmail.subject}
                    </h2>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">From:</span>
                        <span className="text-gray-900">{selectedEmail.from}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">To:</span>
                        <span className="text-gray-900">{selectedEmail.to}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Date:</span>
                        <span className="text-gray-900">
                          {new Date(selectedEmail.date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="py-4">
                    {selectedEmail.html ? (
                      <div
                        className="text-gray-900 prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                      />
                    ) : (
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {selectedEmail.body}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-gray-900 font-semibold mb-3 text-sm">Attachments</h4>
                      <ul className="space-y-3">
                        {selectedEmail.attachments.map((att) => {
                          const isPdf = (att.contentType || '').toLowerCase().includes('pdf');
                          const baseUrl = `/api/admin/emails/attachment?mailbox=${encodeURIComponent(selectedMailbox)}&uid=${encodeURIComponent(selectedEmail.uid || selectedEmail.id)}&index=${att.index}`;
                          const downloadUrl = baseUrl;
                          const previewUrl = `${baseUrl}&disposition=inline`;
                          const isPreviewing = previewAttachmentIndex === att.index;
                          return (
                            <li key={att.index} className="text-sm">
                              <div className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="min-w-0 flex-1">
                                  <span className="text-gray-900 font-medium truncate block">{att.filename}</span>
                                  <span className="text-gray-600 text-xs">{att.contentType} {formatBytes(att.size) ? `· ${formatBytes(att.size)}` : ''}</span>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  {isPdf && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
                                        onClick={() => window.open(previewUrl, '_blank')}
                                      >
                                        Open PDF
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
                                        onClick={() => setPreviewAttachmentIndex(isPreviewing ? null : att.index)}
                                      >
                                        {isPreviewing ? 'Close Preview' : 'Preview Here'}
                                      </Button>
                                    </>
                                  )}
                                  <a
                                    href={downloadUrl}
                                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium inline-flex items-center px-3 py-1"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                              {isPdf && isPreviewing && (
                                <div className="mt-3 border border-gray-300 rounded overflow-hidden bg-white shadow-sm">
                                  <object
                                    data={previewUrl}
                                    type="application/pdf"
                                    className="w-full"
                                    style={{ height: '600px' }}
                                  >
                                    <div className="p-8 text-center">
                                      <p className="text-gray-600 mb-4">
                                        Unable to display PDF preview in browser.
                                      </p>
                                      <a
                                        href={downloadUrl}
                                        className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Click here to download and view the PDF
                                      </a>
                                    </div>
                                  </object>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-gray-200 flex gap-2">
                    <Button
                      onClick={() => handleReply(selectedEmail)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <Forward className="w-4 h-4 mr-2" />
                      Forward
                    </Button>
                  </div>
                </div>
              </AdminCardContent>
            </AdminCard>
          ) : (
            <AdminCard>
              <AdminCardContent className="p-16 text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Email Selected
                </h3>
                <p className="text-gray-600 mb-6">
                  Select an email from the list to view its contents
                </p>
                <Button
                  onClick={handleCompose}
                  className="bg-[#cd7f32] hover:bg-[#b4530a]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Compose New Email
                </Button>
              </AdminCardContent>
            </AdminCard>
          )}
        </div>
      </div>
    </div>
  );
}
