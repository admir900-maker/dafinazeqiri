import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentOption from '@/models/PaymentOption';

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
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const type = searchParams.get('type');

    // Build query
    const query: any = {};
    if (activeOnly) {
      query.isActive = true;
    }
    if (type) {
      query.type = type;
    }

    const paymentOptions = await PaymentOption.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    // Remove sensitive configuration data for security
    const sanitizedOptions = paymentOptions.map(option => ({
      ...option,
      configuration: {
        ...option.configuration,
        apiKey: option.configuration.apiKey ? '***' : undefined,
        secretKey: option.configuration.secretKey ? '***' : undefined,
        // Keep non-sensitive config
        currency: option.configuration.currency,
        minAmount: option.configuration.minAmount,
        maxAmount: option.configuration.maxAmount,
        processingFee: option.configuration.processingFee,
        processingFeeType: option.configuration.processingFeeType
      }
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedOptions
    });

  } catch (error) {
    console.error('Error fetching payment options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment options' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    await connectToDatabase();

    const body = await request.json();
    const {
      name,
      displayName,
      type,
      provider,
      isActive = true,
      isDefault = false,
      configuration = {},
      supportedCurrencies = ['EUR'],
      icon,
      color = '#6366f1',
      description,
      instructions,
      priority = 0,
      testMode = false
    } = body;

    // Validate required fields
    if (!name || !displayName || !type || !provider) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, displayName, type, provider' },
        { status: 400 }
      );
    }

    // Check if payment option with same name already exists
    const existingOption = await PaymentOption.findOne({ name: name.toLowerCase() });
    if (existingOption) {
      return NextResponse.json(
        { success: false, error: 'Payment option with this name already exists' },
        { status: 409 }
      );
    }

    // Create new payment option
    const paymentOption = new PaymentOption({
      name: name.toLowerCase(),
      displayName,
      type,
      provider,
      isActive,
      isDefault,
      configuration,
      supportedCurrencies,
      icon,
      color,
      description,
      instructions,
      priority,
      testMode
    });

    await paymentOption.save();

    return NextResponse.json({
      success: true,
      data: paymentOption
    });

  } catch (error) {
    console.error('Error creating payment option:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment option' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    await connectToDatabase();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment option ID is required' },
        { status: 400 }
      );
    }

    const paymentOption = await PaymentOption.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!paymentOption) {
      return NextResponse.json(
        { success: false, error: 'Payment option not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: paymentOption
    });

  } catch (error) {
    console.error('Error updating payment option:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment option' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment option ID is required' },
        { status: 400 }
      );
    }

    const paymentOption = await PaymentOption.findByIdAndDelete(id);

    if (!paymentOption) {
      return NextResponse.json(
        { success: false, error: 'Payment option not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment option deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment option:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment option' },
      { status: 500 }
    );
  }
}