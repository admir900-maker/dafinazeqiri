'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Heart, Calendar, MapPin, Euro, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { SEO } from '@/components/ui/seo';

interface FavoriteEvent {
  favoriteId: string;
  eventId: string;
  addedAt: string;
  event: {
    _id: string;
    title: string;
    description: string;
    date: string;
    venue: string;
    location: string;
    price: number;
    posterImage?: string;
    bannerImage?: string;
    category: string;
    tickets: Array<{ type: string; price: number; available: number }>;
    isActive: boolean;
  };
}

export default function FavoritesPage() {
  const { user, isLoaded } = useUser();
  const [favorites, setFavorites] = useState<FavoriteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchFavorites();
    }
  }, [isLoaded, user]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/favorites');
      const data = await response.json();

      if (data.success) {
        setFavorites(data.data.favorites);
        // Debug: Check the image URLs
        console.log('Favorites data:', data.data.favorites);
        if (data.data.favorites.length > 0) {
          console.log('First favorite event:', data.data.favorites[0]);
          console.log('First favorite event images:', {
            posterImage: data.data.favorites[0]?.event?.posterImage,
            bannerImage: data.data.favorites[0]?.event?.bannerImage
          });
        }
      } else {
        console.error('Failed to fetch favorites:', data.error);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (eventId: string) => {
    try {
      setRemoving(eventId);
      const response = await fetch(`/api/favorites?eventId=${eventId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setFavorites(prev => prev.filter(fav => fav.eventId !== eventId));
      } else {
        alert(data.error || 'Failed to remove from favorites');
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      alert('Failed to remove from favorites');
    } finally {
      setRemoving(null);
    }
  };

  // Get a random Cloudinary event image as fallback
  const getDefaultEventImage = () => {
    const cloudinaryImages = [
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/people/jazz',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/drums',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/people/dancing',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/sample'
    ];
    return cloudinaryImages[Math.floor(Math.random() * cloudinaryImages.length)];
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(price);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <Heart className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-white/80 mb-6">You need to sign in to view your favorite events.</p>
            <Button asChild className="bg-white/20 text-white hover:bg-white/30">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="My Favorites"
        description="Your favorite events collection"
      />

      <div className="">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                My Favorite Events
              </h1>
              <p className="text-white/90 max-w-2xl mx-auto text-lg drop-shadow-sm">
                Keep track of events you're interested in. Never miss out on your favorite shows and performances.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60"></div>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-24 h-24 text-white/40 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-md">No favorites yet</h2>
                <p className="text-white/80 mb-8 max-w-md mx-auto drop-shadow-sm">
                  Start exploring events and add them to your favorites by clicking the heart icon.
                </p>
                <Button asChild className="bg-white/20 text-white hover:bg-white/30 border-white/30">
                  <Link href="/events">Browse Events</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.favoriteId}
                    className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl shadow-xl overflow-hidden hover:shadow-2xl hover:bg-white/25 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* Event Image */}
                    <div className="relative h-48 overflow-hidden">
                      <OptimizedImage
                        src={
                          favorite.event?.posterImage ||
                          favorite.event?.bannerImage ||
                          getDefaultEventImage()
                        }
                        alt={favorite.event?.title || 'Event'}
                        fallbackSrc="https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player"
                        width={400}
                        height={200}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute top-3 right-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromFavorites(favorite.eventId)}
                          disabled={removing === favorite.eventId}
                          className="bg-white/90 border-white hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        >
                          {removing === favorite.eventId ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {!favorite.event.isActive && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive" className="text-white">
                            Event Ended
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="p-6">
                      <div className="mb-4">
                        <img
                          src="https://res.cloudinary.com/dzwjhgycg/image/upload/v1762017859/Supernova_Title_prak5i.png"
                          alt="Supernova"
                          className="h-10 w-auto object-contain mb-2 drop-shadow-md"
                        />
                        <p className="text-white/80 text-sm line-clamp-2 drop-shadow-sm">
                          {favorite.event.description}
                        </p>
                      </div>

                      {/* Event Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-white/90">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(favorite.event.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/90">
                          <MapPin className="w-4 h-4" />
                          <span>{favorite.event.venue}, {favorite.event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/90">
                          <Euro className="w-4 h-4" />
                          <span>From {formatPrice(favorite.event.price)}</span>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="mb-4">
                        <Badge variant="secondary" className="bg-white/30 text-white border-white/30">
                          {favorite.event.category}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button asChild className="flex-1 bg-white/30 text-white hover:bg-white/40 border-white/30" disabled={!favorite.event.isActive}>
                          <Link href={`/events/${favorite.eventId}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>

                      {/* Added Date */}
                      <div className="mt-4 pt-4 border-t border-white/30">
                        <p className="text-xs text-white/70">
                          Added on {new Date(favorite.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}