import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentOption from '@/models/PaymentOption';

export async function PATCH(request: NextRequest) {
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
    const { action, ids, data } = body;

    if (!action || !ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request. Action and ids array are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'activate':
        result = await PaymentOption.updateMany(
          { _id: { $in: ids } },
          { isActive: true }
        );
        break;

      case 'deactivate':
        result = await PaymentOption.updateMany(
          { _id: { $in: ids } },
          { isActive: false }
        );
        break;

      case 'delete':
        result = await PaymentOption.deleteMany(
          { _id: { $in: ids } }
        );
        break;

      case 'updatePriority':
        if (!data || !Array.isArray(data)) {
          return NextResponse.json(
            { success: false, error: 'Priority data array is required' },
            { status: 400 }
          );
        }

        // Update priorities for multiple items
        const bulkOps = data.map((item: { id: string; priority: number }) => ({
          updateOne: {
            filter: { _id: item.id },
            update: { priority: item.priority }
          }
        }));

        result = await PaymentOption.bulkWrite(bulkOps);
        break;

      case 'setDefault':
        if (ids.length !== 1) {
          return NextResponse.json(
            { success: false, error: 'Only one payment option can be set as default' },
            { status: 400 }
          );
        }

        // First, remove default from all others
        await PaymentOption.updateMany({}, { isDefault: false });

        // Set the selected one as default
        result = await PaymentOption.updateOne(
          { _id: ids[0] },
          { isDefault: true, isActive: true }
        );
        break;

      case 'toggleTestMode':
        const currentOptions = await PaymentOption.find({ _id: { $in: ids } });
        const bulkToggleOps = currentOptions.map((option) => ({
          updateOne: {
            filter: { _id: option._id },
            update: { testMode: !option.testMode }
          }
        }));

        result = await PaymentOption.bulkWrite(bulkToggleOps);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${action} operation completed successfully`,
      modifiedCount: 'modifiedCount' in result ? result.modifiedCount : ('deletedCount' in result ? result.deletedCount : 0),
      data: result
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}