/**
 * Wallet Pass Utilities
 * Provides helper functions for generating Apple Wallet and Google Pay passes
 */

import { getSiteConfig } from './settings';

export interface TicketData {
  ticketId: string;
  ticketName: string;
  bookingId: string;
  bookingReference: string;
  customerName?: string;
  event: {
    _id: string;
    title: string;
    date: string;
    time: string;
    venue: string;
    location: string;
    posterImage?: string;
    bannerImage?: string;
  };
  userId: string;
}

export interface ApplePassField {
  key: string;
  label: string;
  value: string;
  textAlignment?: 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight';
}

export interface ApplePassData {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  eventTicket: {
    primaryFields: ApplePassField[];
    secondaryFields: ApplePassField[];
    auxiliaryFields: ApplePassField[];
    backFields: ApplePassField[];
  };
  barcodes: Array<{
    message: string;
    format: string;
    messageEncoding: string;
    altText: string;
  }>;
  locations?: Array<{
    latitude: number;
    longitude: number;
    relevantText: string;
    maximumDistance?: number;
  }>;
  relevantDate?: string;
  expirationDate?: string;
  maxDistance?: number;
  webServiceURL?: string;
  authenticationToken?: string;
}

export class WalletPassGenerator {
  /**
   * Generates Apple Wallet pass data structure
   */
  static async generateApplePass(ticketData: TicketData): Promise<ApplePassData> {
    const siteConfig = await getSiteConfig();

    const barcodeData = JSON.stringify({
      eventId: ticketData.event._id,
      ticketId: ticketData.ticketId,
      userId: ticketData.userId,
      bookingId: ticketData.bookingId,
      timestamp: Date.now()
    });

    return {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.com.biletara.eventticket',
      serialNumber: ticketData.ticketId,
      teamIdentifier: process.env.APPLE_TEAM_ID || 'BILETARA',
      organizationName: siteConfig.siteName,
      description: `${ticketData.event.title} - ${ticketData.ticketName}`,
      logoText: siteConfig.siteName,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(30, 58, 138)',
      labelColor: 'rgb(255, 255, 255)',
      eventTicket: {
        primaryFields: [
          {
            key: 'event',
            label: 'EVENT',
            value: ticketData.event.title,
            textAlignment: 'PKTextAlignmentLeft'
          }
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: new Date(ticketData.event.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            textAlignment: 'PKTextAlignmentLeft'
          },
          {
            key: 'time',
            label: 'TIME',
            value: this.formatTime(ticketData.event.time),
            textAlignment: 'PKTextAlignmentRight'
          }
        ],
        auxiliaryFields: [
          {
            key: 'venue',
            label: 'VENUE',
            value: ticketData.event.venue,
            textAlignment: 'PKTextAlignmentLeft'
          },
          {
            key: 'location',
            label: 'LOCATION',
            value: ticketData.event.location,
            textAlignment: 'PKTextAlignmentLeft'
          },
          {
            key: 'ticket',
            label: 'TICKET TYPE',
            value: ticketData.ticketName,
            textAlignment: 'PKTextAlignmentRight'
          }
        ],
        backFields: [
          {
            key: 'booking',
            label: 'Booking Reference',
            value: ticketData.bookingReference
          },
          {
            key: 'terms',
            label: 'Terms and Conditions',
            value: 'This ticket is valid for one admission only. Present QR code at entrance. No refunds or exchanges. Event is subject to change without notice.'
          },
          {
            key: 'contact',
            label: 'Contact Information',
            value: `For support, visit ${siteConfig.siteUrl || 'our website'} or email info@${siteConfig.siteUrl || 'example.com'}`
          },
          {
            key: 'instructions',
            label: 'Entry Instructions',
            value: 'Please arrive 30 minutes before the event start time. Present this pass at the entrance along with a valid photo ID.'
          }
        ]
      },
      barcodes: [
        {
          message: barcodeData,
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: ticketData.ticketId
        }
      ],
      locations: [
        {
          latitude: 41.6086,
          longitude: 21.7453, // Default to Macedonia coordinates
          relevantText: `${ticketData.event.title} at ${ticketData.event.venue}`,
          maximumDistance: 1000
        }
      ],
      relevantDate: ticketData.event.date,
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      maxDistance: 1000,
      webServiceURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet`,
      authenticationToken: Buffer.from(`${ticketData.bookingId}:${ticketData.ticketId}:${ticketData.userId}`).toString('base64')
    };
  }

  /**
   * Generates Google Pay pass object
   */
  static generateGooglePayObject(ticketData: TicketData) {
    const barcodeData = JSON.stringify({
      eventId: ticketData.event._id,
      ticketId: ticketData.ticketId,
      userId: ticketData.userId,
      bookingId: ticketData.bookingId,
      timestamp: Date.now()
    });

    return {
      iss: process.env.GOOGLE_PAY_ISSUER_EMAIL || 'your-service-account@your-project.iam.gserviceaccount.com',
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
      payload: {
        eventTicketObjects: [
          {
            id: `${process.env.GOOGLE_PAY_ISSUER_ID || '3388000000022'}.${ticketData.ticketId}`,
            classId: `${process.env.GOOGLE_PAY_ISSUER_ID || '3388000000022'}.event_ticket_class`,
            state: 'ACTIVE',
            ticketHolderName: ticketData.customerName || 'Ticket Holder',
            ticketNumber: ticketData.ticketId,
            eventName: {
              defaultValue: {
                language: 'en-US',
                value: ticketData.event.title
              }
            },
            dateTime: {
              start: ticketData.event.date,
              end: new Date(new Date(ticketData.event.date).getTime() + 4 * 60 * 60 * 1000).toISOString() // +4 hours
            },
            venue: {
              name: {
                defaultValue: {
                  language: 'en-US',
                  value: ticketData.event.venue
                }
              },
              address: {
                defaultValue: {
                  language: 'en-US',
                  value: ticketData.event.location
                }
              }
            },
            barcode: {
              type: 'QR_CODE',
              value: barcodeData,
              alternateText: ticketData.ticketId
            },
            seatInfo: {
              section: {
                defaultValue: {
                  language: 'en-US',
                  value: ticketData.ticketName
                }
              }
            },
            ticketType: {
              defaultValue: {
                language: 'en-US',
                value: ticketData.ticketName
              }
            },
            textModulesData: [
              {
                id: 'booking_reference',
                header: 'Booking Reference',
                body: ticketData.bookingReference
              },
              {
                id: 'instructions',
                header: 'Entry Instructions',
                body: 'Please arrive 30 minutes before the event start time. Present this pass at the entrance along with a valid photo ID.'
              }
            ],
            linksModuleData: {
              uris: [
                {
                  uri: `${process.env.NEXT_PUBLIC_APP_URL}/bookings`,
                  description: 'View Your Bookings',
                  id: 'view_bookings'
                },
                {
                  uri: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
                  description: 'Contact Support',
                  id: 'support'
                }
              ]
            },
            imageModulesData: [
              {
                id: 'event_image',
                mainImage: {
                  sourceUri: {
                    uri: ticketData.event.posterImage || ticketData.event.bannerImage || `${process.env.NEXT_PUBLIC_APP_URL}/placeholder-event.svg`
                  },
                  contentDescription: {
                    defaultValue: {
                      language: 'en-US',
                      value: ticketData.event.title
                    }
                  }
                }
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * Formats time string for display
   */
  private static formatTime(timeString: string): string {
    if (!timeString) return '20:00'; // Default time

    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return timeString; // Return original if parsing fails
    }
  }

  /**
   * Generates setup instructions for wallet integration
   */
  static getSetupInstructions() {
    return {
      apple: {
        title: 'Apple Wallet Setup',
        requirements: [
          'Apple Developer Account',
          'Pass Type ID Certificate',
          'WWDR Intermediate Certificate',
          'Pass signing and PKPass generation'
        ],
        envVars: [
          'APPLE_PASS_TYPE_ID',
          'APPLE_TEAM_ID',
          'APPLE_CERTIFICATE_PATH',
          'APPLE_CERTIFICATE_PASSWORD'
        ]
      },
      google: {
        title: 'Google Pay Setup',
        requirements: [
          'Google Cloud Project',
          'Google Wallet API enabled',
          'Service Account with credentials',
          'Issuer ID and Class definitions'
        ],
        envVars: [
          'GOOGLE_PAY_ISSUER_EMAIL',
          'GOOGLE_PAY_ISSUER_ID',
          'GOOGLE_SERVICE_ACCOUNT_KEY',
          'GOOGLE_APPLICATION_CREDENTIALS'
        ]
      }
    };
  }
}