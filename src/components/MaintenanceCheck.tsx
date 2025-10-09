import { isMaintenanceMode } from '@/lib/settings';
import { redirect } from 'next/navigation';

export async function MaintenanceCheck({
  children,
  skipPaths = ['/admin', '/api', '/maintenance']
}: {
  children: React.ReactNode;
  skipPaths?: string[];
}) {
  // Check if we should skip maintenance check for this path
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const shouldSkip = skipPaths.some(path => currentPath.startsWith(path));

  if (shouldSkip) {
    return <>{children}</>;
  }

  try {
    const maintenanceEnabled = await isMaintenanceMode();

    if (maintenanceEnabled) {
      redirect('/maintenance');
    }
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // Continue normally if we can't check maintenance mode
  }

  return <>{children}</>;
}