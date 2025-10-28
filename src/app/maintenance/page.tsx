import { getSiteConfig, getSystemConfig } from '@/lib/settings';

export default async function MaintenancePage() {
  const siteConfig = await getSiteConfig();
  const systemConfig = await getSystemConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center px-4">
      <div className="max-w-lg mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            We&apos;ll be back soon!
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <p className="text-gray-600 text-lg mb-4">
            {systemConfig.maintenanceMessage}
          </p>
          <p className="text-gray-500 text-sm">
            We apologize for any inconvenience and appreciate your patience.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          <p>Thank you for choosing {siteConfig.siteName}</p>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata() {
  const siteConfig = await getSiteConfig();

  return {
    title: `Maintenance - ${siteConfig.siteName}`,
    description: 'We are currently performing maintenance. Please check back later.',
    robots: 'noindex, nofollow',
  };
}