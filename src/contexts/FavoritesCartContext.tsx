'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  loading: boolean;
}

interface CartItem {
  eventId: string;
  ticketType: string;
  quantity: number;
  price: number;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (eventId: string, ticketType: string) => void;
  updateQuantity: (eventId: string, ticketType: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
const CartContext = createContext<CartContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshFavorites = async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/favorites');
      const data = await response.json();

      if (data.success) {
        const favoriteIds = data.data.favorites.map((fav: any) => fav.eventId);
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (eventId: string) => {
    if (!user) return;

    const isFav = favorites.includes(eventId);

    try {
      if (isFav) {
        // Remove from favorites
        const response = await fetch(`/api/favorites?eventId=${eventId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setFavorites(prev => prev.filter(id => id !== eventId));
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        });

        if (response.ok) {
          setFavorites(prev => [...prev, eventId]);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const isFavorite = (eventId: string) => favorites.includes(eventId);

  useEffect(() => {
    if (isLoaded) {
      refreshFavorites();
    }
  }, [isLoaded, user]);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      isFavorite,
      toggleFavorite,
      refreshFavorites,
      loading
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        cartItem => cartItem.eventId === item.eventId && cartItem.ticketType === item.ticketType
      );

      if (existingIndex > -1) {
        // Update existing item quantity
        const updated = [...prev];
        updated[existingIndex].quantity += item.quantity;
        return updated;
      } else {
        // Add new item
        return [...prev, item];
      }
    });
  };

  const removeFromCart = (eventId: string, ticketType: string) => {
    setCartItems(prev =>
      prev.filter(item => !(item.eventId === eventId && item.ticketType === ticketType))
    );
  };

  const updateQuantity = (eventId: string, ticketType: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(eventId, ticketType);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.eventId === eventId && item.ticketType === ticketType
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};