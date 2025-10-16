import { Loader2 } from 'lucide-react';

interface PageLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function PageLoading({ message = 'Loading...', fullScreen = true }: PageLoadingProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600 text-lg font-medium">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-3 text-blue-600 animate-spin" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export function CardLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 mb-3 text-blue-600 animate-spin" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

export function TableLoading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
      </div>
    </div>
  );
}