'use client'

import { useState, useEffect } from 'react'
import { BackgroundWrapper } from '@/components/ui/background-wrapper'
import { FormField, ValidatedForm } from '@/components/ui/validated-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateContactForm } from '@/lib/validation'
import { logError } from '@/lib/errorLogger'
import { Mail, Phone, MapPin, Send } from 'lucide-react'

interface SiteConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  currency: string;
  timezone: string;
  logoUrl: string;
  faviconUrl: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: 'BiletAra', // fallback
    siteDescription: '',
    siteUrl: '',
    currency: 'EUR',
    timezone: 'UTC',
    logoUrl: '',
    faviconUrl: ''
  })

  // Fetch site configuration
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const response = await fetch('/api/site-config')
        if (response.ok) {
          const config = await response.json()
          setSiteConfig(config)
        }
      } catch (error) {
        console.error('Failed to fetch site config:', error)
      }
    }

    fetchSiteConfig()
  }, [])

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      // Reset form on success
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      })
    } catch (error: any) {
      logError('Contact form submission failed', error, { action: 'contact-form' })
      throw error
    }
  }

  return (
    <BackgroundWrapper fullHeight={true}>
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Contact Us</h1>
            <p className="text-xl text-white/90 drop-shadow-md max-w-2xl mx-auto">
              Get in touch with the {siteConfig.siteName} team. We're here to help with any questions about tickets, events, or our platform.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Customer info
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white/90 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-white/70" />
                    <span>info@{siteConfig.siteUrl || 'example.com'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-white/70" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <p className="text-sm text-white/80 mt-4">
                    Available Monday-Friday, 9 AM - 6 PM EST
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Business Inquiries
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white/90 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-white/70" />
                    <span>business@{siteConfig.siteUrl || 'example.com'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-white/70" />
                    <span>+1 (555) 987-6543</span>
                  </div>
                  <p className="text-sm text-white/80 mt-4">
                    For partnerships, event hosting, and corporate inquiries
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Our Office
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-white/90">
                  <p>123 Music Street</p>
                  <p>Entertainment District</p>
                  <p>New York, NY 10001</p>
                  <p className="text-sm text-white/80 mt-3">
                    Visit us for in-person support and consultations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ValidatedForm
                  onSubmit={handleSubmit}
                  validate={validateContactForm}
                  submitText="Send Message"
                  resetOnSuccess={true}
                >
                  <FormField
                    id="name"
                    label="Full Name"
                    type="text"
                    value={formData.name}
                    onChange={(value) => setFormData(prev => ({ ...prev, name: value as string }))}
                    placeholder="Enter your full name"
                    required
                  />

                  <FormField
                    id="email"
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(value) => setFormData(prev => ({ ...prev, email: value as string }))}
                    placeholder="Enter your email address"
                    required
                  />

                  <FormField
                    id="subject"
                    label="Subject"
                    type="text"
                    value={formData.subject}
                    onChange={(value) => setFormData(prev => ({ ...prev, subject: value as string }))}
                    placeholder="What is this regarding?"
                    required
                  />

                  <FormField
                    id="message"
                    label="Message"
                    type="textarea"
                    value={formData.message}
                    onChange={(value) => setFormData(prev => ({ ...prev, message: value as string }))}
                    placeholder="Please describe your inquiry in detail..."
                    rows={6}
                    required
                  />
                </ValidatedForm>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl mt-8">
            <CardHeader>
              <CardTitle className="text-white drop-shadow-md">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="text-white/90 space-y-4">
              <div>
                <h4 className="font-semibold text-white mb-2">How do I get a refund for my tickets?</h4>
                <p className="text-sm text-white/80">
                  Refund policies vary by event. Please check the specific event's refund policy or contact our support team for assistance.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Can I transfer my tickets to someone else?</h4>
                <p className="text-sm text-white/80">
                  Yes, most tickets can be transferred through your account dashboard. Some events may have restrictions.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">What payment methods do you accept?</h4>
                <p className="text-sm text-white/80">
                  We accept all major credit cards, debit cards, and digital payment methods through our secure payment processor.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BackgroundWrapper>
  );
}