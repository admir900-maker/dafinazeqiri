import { NextResponse } from 'next/server';
import { isMaintenanceMode, getSystemConfig } from '@/lib/settings';

export async function GET() {
  try {
    const maintenanceEnabled = await isMaintenanceMode();
    const systemConfig = await getSystemConfig();

    return NextResponse.json({
      maintenanceMode: maintenanceEnabled,
      maintenanceMessage: systemConfig.maintenanceMessage || 'We are currently performing maintenance. Please check back later.'
    });
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    return NextResponse.json(
      {
        maintenanceMode: false,
        maintenanceMessage: '',
        error: 'Failed to check maintenance status'
      },
      { status: 500 }
    );
  }
}