import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Settings from '@/models/Settings';

// POST /api/admin/settings/test - Test various service configurations
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { service, config } = await request.json();

    if (!service || !config) {
      return NextResponse.json({
        success: false,
        error: 'Service and config are required'
      }, { status: 400 });
    }

    let testResult = { success: false, message: 'Unknown service' };

    switch (service) {
      case 'smtp':
        testResult = await testSMTPConnection(config);
        break;
      case 'stripe':
        testResult = await testStripeConnection(config);
        break;
      case 'cloudinary':
        testResult = await testCloudinaryConnection(config);
        break;
      case 'database':
        testResult = await testDatabaseConnection();
        break;
      case 'validation':
        testResult = await testValidationSettings();
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown service: ${service}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message
    });

  } catch (error) {
    console.error('Error testing service:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

async function testSMTPConnection(config: any) {
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      }
    });

    await transporter.verify();

    return {
      success: true,
      message: 'SMTP connection successful'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SMTP connection failed: ${error.message}`
    };
  }
}

async function testStripeConnection(config: any) {
  try {
    const stripe = require('stripe')(config.secretKey);

    // Test by retrieving account information
    const account = await stripe.account.retrieve();

    return {
      success: true,
      message: 'Stripe connection successful',
      data: {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Stripe connection failed: ${error.message}`
    };
  }
}

async function testCloudinaryConnection(config: any) {
  try {
    const cloudinary = require('cloudinary').v2;

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret
    });

    // Test by getting account usage
    const usage = await cloudinary.api.usage();

    return {
      success: true,
      message: 'Cloudinary connection successful',
      data: {
        cloudName: config.cloudName,
        credits: usage.credits?.remaining || 'N/A'
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Cloudinary connection failed: ${error.message}`
    };
  }
}

async function testDatabaseConnection() {
  try {
    await connectToDatabase();

    // Test by counting settings documents
    const count = await Settings.countDocuments();

    return {
      success: true,
      message: 'Database connection successful',
      data: {
        settingsCount: count
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Database connection failed: ${error.message}`
    };
  }
}

async function testValidationSettings() {
  try {
    // Test validation configuration
    await connectToDatabase();

    const settings = await Settings.findOne() || new Settings();
    const validation = settings.validation || {};

    // Test basic validation settings
    const tests = [
      {
        name: 'QR Code Validation',
        enabled: validation.qrCodeEnabled ?? true,
        status: validation.qrCodeEnabled !== false ? 'enabled' : 'disabled'
      },
      {
        name: 'Scanner Integration',
        enabled: validation.scannerEnabled ?? true,
        status: validation.scannerEnabled !== false ? 'enabled' : 'disabled'
      },
      {
        name: 'Multiple Scans',
        enabled: validation.multipleScansAllowed ?? false,
        status: validation.multipleScansAllowed ? 'allowed' : 'restricted'
      },
      {
        name: 'Validation Timeout',
        enabled: true,
        status: `${validation.validationTimeout || 30} seconds`
      },
      {
        name: 'Anti-Replay Protection',
        enabled: validation.antiReplayEnabled ?? true,
        status: validation.antiReplayEnabled !== false ? 'protected' : 'vulnerable'
      }
    ];

    return {
      success: true,
      message: 'Validation settings test completed',
      data: {
        tests,
        summary: {
          total: tests.length,
          enabled: tests.filter(t => t.enabled).length,
          configured: Object.keys(validation).length
        }
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Validation settings test failed: ${error.message}`
    };
  }
}