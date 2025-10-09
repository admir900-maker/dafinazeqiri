'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Grid, List, Calendar, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundWrapper } from '@/components/ui/background-wrapper';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  eventCount: number;
  isActive: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?updateCounts=true');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEvents = categories.reduce((sum, category) => sum + category.eventCount, 0);

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded mb-6 w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-white/20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  if (error) {
    return (
      <BackgroundWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
            <p className="text-white/80 mb-6">{error}</p>
            <Button onClick={fetchCategories} className="bg-purple-600 hover:bg-purple-700">
              Try Again
            </Button>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Event Categories
          </h1>
          <p className="text-xl text-white/80 mb-6 max-w-2xl mx-auto">
            Discover amazing events across different categories. From concerts to conferences,
            find exactly what you're looking for.
          </p>

          {/* Stats */}
          <div className="flex justify-center items-center gap-8 text-white/90">
            <div className="flex items-center gap-2">
              <Grid className="h-5 w-5" />
              <span>{categories.length} Categories</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{totalEvents} Events</span>
            </div>
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
              }
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
              }
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Categories Grid/List */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No categories found</h3>
            <p className="text-white/70">
              {searchTerm ? 'Try adjusting your search terms.' : 'No categories available at the moment.'}
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category._id}
                category={category}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

        {/* Call to Action */}
        {filteredCategories.length > 0 && (
          <div className="text-center mt-16 py-12 border-t border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Can't find what you're looking for?
            </h2>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Browse all events or get in touch with us to suggest new categories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/events">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  Browse All Events
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </BackgroundWrapper>
  );
}

interface CategoryCardProps {
  category: Category;
  viewMode: 'grid' | 'list';
}

function CategoryCard({ category, viewMode }: CategoryCardProps) {
  if (viewMode === 'list') {
    return (
      <Link href={`/categories/${category.slug}`}>
        <Card className="bg-white/10 backdrop-blur-lg border border-white/30 hover:bg-white/20 transition-all duration-300 cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: category.color + '20', border: `2px solid ${category.color}` }}
              >
                {category.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-1 truncate">
                  {category.name}
                </h3>
                <p className="text-white/70 text-sm mb-2 line-clamp-2">
                  {category.description || 'Discover amazing events in this category.'}
                </p>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{category.eventCount} events</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/60 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/categories/${category.slug}`}>
      <Card className="group bg-white/10 backdrop-blur-lg border border-white/30 hover:bg-white/20 transition-all duration-300 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform"
              style={{ backgroundColor: category.color + '20', border: `2px solid ${category.color}` }}
            >
              {category.icon}
            </div>
            <ArrowRight className="h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
          <CardTitle className="text-white text-lg group-hover:text-white transition-colors">
            {category.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-white/70 text-sm mb-4 line-clamp-3">
            {category.description || 'Discover amazing events in this category.'}
          </p>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-white/60">
              <Calendar className="h-4 w-4" />
              <span>{category.eventCount} events</span>
            </div>
            {category.eventCount > 0 && (
              <span className="text-xs px-2 py-1 bg-purple-600/30 text-purple-200 rounded-full">
                Active
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}