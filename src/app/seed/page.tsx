'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Check, AlertCircle } from 'lucide-react';

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to seed database');
      }
    } catch (err) {
      setError('Network error occurred while seeding database');
      console.error('Seeding error:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Database Seeding
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Initialize your MongoDB database with sample categories and events data.
            This will create a comprehensive set of test data for development and testing.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Seed Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Categories</h3>
                  <p className="text-sm text-blue-700">
                    10 diverse event categories including Music, Technology, Arts, Sports, Food, and more.
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">Events</h3>
                  <p className="text-sm text-green-700">
                    10 sample events with detailed information, ticket types, and realistic data.
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Database: biletaraks</h4>
                    <p className="text-sm text-gray-600">
                      This will clear existing data and populate with fresh sample data.
                    </p>
                  </div>
                  <Button
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="min-w-[120px]"
                  >
                    {isSeeding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Seeding...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Start Seeding
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Result */}
        {result && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Check className="h-6 w-6" />
                Seeding Completed Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Categories Created</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {result.data.categories}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Events Created</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {result.data.events}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Browse events at <a href="/events" className="text-blue-600 hover:underline">/events</a></li>
                    <li>• View categories at <a href="/categories" className="text-blue-600 hover:underline">/categories</a></li>
                    <li>• Access admin panel at <a href="/admin" className="text-blue-600 hover:underline">/admin</a></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Result */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-6 w-6" />
                Seeding Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error}</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Safe Operation</h3>
                <p className="text-sm text-gray-600">
                  Seeding clears existing data and creates fresh sample data for testing.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Complete Data</h3>
                <p className="text-sm text-gray-600">
                  Includes categories, events, ticket types, and all necessary relationships.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Development Only</h3>
                <p className="text-sm text-gray-600">
                  This seeding process is intended for development and testing environments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}