'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import { BackgroundWrapper } from '@/components/ui/background-wrapper';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { validateEvent, ValidationError, formatValidationErrors } from '@/lib/validation';
import { logError } from '@/lib/errorLogger';
import {
  BarChart3,
  Users,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Settings,
  Eye,
  EyeOff,
  Star,
  Copy,
  Download,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  CreditCard,
  Database,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface TicketType {
  name: string;
  price: number;
  capacity: number;
  availableTickets: number;
  description: string;
  color: string;
}

interface DebugInfo {
  authenticated: boolean;
  userId: string;
  isAdmin: boolean;
  error?: string;
  details?: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  endDate?: string;
  location: string;
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
  posterImage?: string;
  bannerImage?: string;
  youtubeTrailer?: string;
  ticketTypes: TicketType[];
  category: string;
  ageLimit?: number;
  duration?: number;
  language?: string;
  artists: string[];
  organizer?: string;
  status: string;
  tags: string[];
  maxCapacity?: number;
  // Legacy fields
  price?: number;
  capacity?: number;
  availableTickets?: number;
}

interface Ticket {
  _id: string;
  eventId: string;
  userId: string;
  qrCode: string;
  isValidated: boolean;
  createdAt: string;
}

interface User {
  _id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface DashboardStats {
  totalEvents: number;
  totalTickets: number;
  totalRevenue: number;
  activeEvents: number;
  upcomingEvents: number;
  recentTickets: Ticket[];
}

export default function AdminPage() {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { user } = useUser();
  const { setCurrency } = useCurrency();
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endDate: '',
    location: '',
    venue: '',
    address: '',
    city: '',
    country: '',
    posterImage: '',
    bannerImage: '',
    youtubeTrailer: '',
    category: 'concert',
    ageLimit: '',
    duration: '',
    language: '',
    artists: '',
    organizer: '',
    tags: '',
    metaDescription: '',
    maxCapacity: '',
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: 'General Admission', price: 0, capacity: 0, availableTickets: 0, description: '', color: '#3B82F6' }
  ]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Configuration State
  const [paymentSettings, setPaymentSettings] = useState({
    stripePublicKey: '',
    stripeSecretKey: '',
    platformFee: 5,
    currency: 'eur',
    validationWindowDays: 1,
    validationStartDays: 0,
    allowValidationAnytime: false,
    // SMTP Settings
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    senderEmail: '',
    senderName: 'BiletAra'
  });
  const [paymentSettingsSaved, setPaymentSettingsSaved] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Email Configuration State
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch functions
  const fetchDashboardStats = async () => {
    try {
      const [eventsRes, ticketsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/tickets')
      ]);

      if (eventsRes.ok && ticketsRes.ok) {
        const eventsData = await eventsRes.json();
        const ticketsData = await ticketsRes.json();

        const stats: DashboardStats = {
          totalEvents: eventsData.length,
          totalTickets: ticketsData.length,
          totalRevenue: ticketsData.reduce((sum: number, ticket: Ticket) => {
            const event = eventsData.find((e: Event) => e._id === ticket.eventId);
            if (event && event.ticketTypes?.length > 0) {
              return sum + event.ticketTypes[0].price; // Simplified revenue calculation
            }
            return sum + (event?.price || 0);
          }, 0),
          activeEvents: eventsData.filter((e: Event) => new Date(e.date) >= new Date()).length,
          upcomingEvents: eventsData.filter((e: Event) => new Date(e.date) > new Date()).length,
          recentTickets: ticketsData.slice(0, 5)
        };

        setDashboardStats(stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchEvents();
      fetchTickets();
      fetchDashboardStats();
      fetchUsers();
      checkAuth();
    }
  }, [isLoaded, isSignedIn]);

  const fetchPaymentSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch('/api/admin/payment-settings');
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(prev => ({
          ...prev,
          stripePublicKey: data.stripePublishableKey || '',
          stripeSecretKey: data.stripeSecretKey === '••••••••••••••••' ? prev.stripeSecretKey : data.stripeSecretKey || '',
          platformFee: data.platformFee || 5,
          currency: data.currency || 'eur',
          validationWindowDays: data.validationWindowDays || 1,
          validationStartDays: data.validationStartDays || 0,
          allowValidationAnytime: data.allowValidationAnytime || false,
          // SMTP Settings
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 587,
          smtpSecure: data.smtpSecure || false,
          smtpUser: data.smtpUser || '',
          smtpPass: data.smtpPass === '••••••••••••••••' ? prev.smtpPass : data.smtpPass || '',
          senderEmail: data.senderEmail || '',
          senderName: data.senderName || 'BiletAra'
        }));
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Load payment settings after authentication is confirmed
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchPaymentSettings();
    }
  }, [isLoaded, isSignedIn, fetchPaymentSettings]);

  // Show loading until Clerk is loaded
  if (!isLoaded) {
    return <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Loading...</h1>
    </div>;
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <p>You must be signed in to access the admin panel.</p>
        <p>Please <Link href="/auth/signin" className="underline">sign in</Link> first.</p>
      </div>
    </div>;
  }

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/debug/auth');
      const data = await res.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Failed to check auth:', error);
    }
  };

  const testAPI = async () => {
    try {
      const res = await fetch('/api/test');
      const data = await res.json();
      alert(`API Test: ${data.message}`);
    } catch (error) {
      console.error('API test failed:', error);
      alert('API test failed');
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } else {
        const errorData = await res.json();
        console.error('Failed to fetch events:', errorData);
        setError(`Failed to fetch events: ${errorData.error}`);
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Error fetching events');
      setEvents([]);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');

      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      } else {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = { error: `HTTP ${res.status} ${res.statusText}` };
        }
        console.error('Failed to fetch tickets:', errorData);
        setError(`Failed to fetch tickets: ${errorData.error || 'Unknown error'}`);
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Error fetching tickets: ${errorMessage}`);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, {
      name: '',
      price: 0,
      capacity: 0,
      availableTickets: 0,
      description: '',
      color: '#3B82F6'
    }]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: keyof TicketType, value: string | number) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'capacity') {
      updated[index].availableTickets = typeof value === 'string' ? parseInt(value) || 0 : value;
    }
    setTicketTypes(updated);
  };

  // Event management functions
  const toggleEventStatus = async (eventId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchEvents();
        alert(`Event ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
      }
    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Error updating event status');
    }
  };

  const toggleFeaturedEvent = async (eventId: string, currentFeatured: boolean) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !currentFeatured }),
      });

      if (res.ok) {
        fetchEvents();
        alert(`Event ${!currentFeatured ? 'featured' : 'unfeatured'} successfully`);
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      alert('Error updating featured status');
    }
  };

  const duplicateEvent = async (event: Event) => {
    try {
      const duplicatedEvent = {
        ...event,
        title: `${event.title} (Copy)`,
        status: 'draft',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      };

      delete (duplicatedEvent as any)._id;

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedEvent),
      });

      if (res.ok) {
        fetchEvents();
        alert('Event duplicated successfully');
      }
    } catch (error) {
      console.error('Error duplicating event:', error);
      alert('Error duplicating event');
    }
  };

  // User management functions
  const promoteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        fetchUsers();
        alert('User promoted to admin successfully');
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      alert('Error promoting user');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });

      if (res.ok) {
        fetchUsers();
        alert(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setValidationErrors([]);

    const eventData = {
      ...newEvent,
      artists: newEvent.artists.split(',').map(a => a.trim()).filter(a => a),
      tags: newEvent.tags.split(',').map(t => t.trim()).filter(t => t),
      ageLimit: newEvent.ageLimit ? parseInt(newEvent.ageLimit) : undefined,
      duration: newEvent.duration ? parseInt(newEvent.duration) : undefined,
      maxCapacity: newEvent.maxCapacity ? parseInt(newEvent.maxCapacity) : undefined,
      ticketTypes: ticketTypes.map(tt => ({
        ...tt,
        availableTickets: tt.capacity
      })),
    };

    // Validate the event data
    const validation = validateEvent(eventData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        // Reset form
        setNewEvent({
          title: '',
          description: '',
          date: '',
          time: '',
          endDate: '',
          location: '',
          venue: '',
          address: '',
          city: '',
          country: '',
          posterImage: '',
          bannerImage: '',
          youtubeTrailer: '',
          category: 'concert',
          ageLimit: '',
          duration: '',
          language: '',
          artists: '',
          organizer: '',
          tags: '',
          metaDescription: '',
          maxCapacity: '',
        });
        setTicketTypes([
          { name: 'General Admission', price: 0, capacity: 0, availableTickets: 0, description: '', color: '#3B82F6' }
        ]);
        setValidationErrors([]);
        await fetchEvents();
        alert('Event created successfully!');
      } else {
        const errorData = await res.json();
        setValidationErrors([{
          field: 'submit',
          message: errorData.error || 'Failed to create event'
        }]);
      }
    } catch (error: any) {
      logError('Event creation failed', error, { action: 'create-event' });
      setValidationErrors([{
        field: 'submit',
        message: 'Network error occurred while creating event'
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    // Populate the form with the event data for editing
    setNewEvent({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time || '',
      endDate: event.endDate || '',
      location: event.location,
      venue: event.venue || '',
      address: event.address || '',
      city: event.city || '',
      country: event.country || '',
      posterImage: event.posterImage || '',
      bannerImage: event.bannerImage || '',
      youtubeTrailer: event.youtubeTrailer || '',
      category: event.category,
      ageLimit: event.ageLimit ? event.ageLimit.toString() : '',
      duration: event.duration ? event.duration.toString() : '',
      language: event.language || '',
      artists: event.artists ? event.artists.join(', ') : '',
      organizer: event.organizer || '',
      tags: event.tags ? event.tags.join(', ') : '',
      metaDescription: '',
      maxCapacity: event.maxCapacity ? event.maxCapacity.toString() : '',
    });

    // Set ticket types
    if (event.ticketTypes && event.ticketTypes.length > 0) {
      setTicketTypes(event.ticketTypes);
    } else {
      // Legacy events with single price/capacity
      setTicketTypes([{
        name: 'General Admission',
        price: event.price || 0,
        capacity: event.capacity || 0,
        availableTickets: event.availableTickets || 0,
        description: '',
        color: '#3B82F6'
      }]);
    }

    // Store the event ID for updating
    setEditingEventId(event._id);
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Refresh the events list
        fetchEvents();
        alert('Event deleted successfully');
      } else {
        const errorData = await res.json();
        alert(`Failed to delete event: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setValidationErrors([]);

    if (!editingEventId) {
      setValidationErrors([{
        field: 'submit',
        message: 'No event selected for editing'
      }]);
      setIsSubmitting(false);
      return;
    }

    const eventData = {
      ...newEvent,
      artists: newEvent.artists.split(',').map(a => a.trim()).filter(a => a),
      tags: newEvent.tags.split(',').map(t => t.trim()).filter(t => t),
      ageLimit: newEvent.ageLimit ? parseInt(newEvent.ageLimit) : undefined,
      duration: newEvent.duration ? parseInt(newEvent.duration) : undefined,
      maxCapacity: newEvent.maxCapacity ? parseInt(newEvent.maxCapacity) : undefined,
      ticketTypes: ticketTypes.map(tt => ({
        ...tt,
        availableTickets: tt.capacity
      })),
    };

    // Validate the event data
    const validation = validateEvent(eventData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${editingEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const responseData = await res.json();

      if (res.ok) {
        // Reset form and editing state
        setNewEvent({
          title: '',
          description: '',
          date: '',
          time: '',
          endDate: '',
          location: '',
          venue: '',
          address: '',
          city: '',
          country: '',
          posterImage: '',
          bannerImage: '',
          youtubeTrailer: '',
          category: 'concert',
          ageLimit: '',
          duration: '',
          language: '',
          artists: '',
          organizer: '',
          tags: '',
          metaDescription: '',
          maxCapacity: '',
        });
        setTicketTypes([
          { name: 'General Admission', price: 0, capacity: 0, availableTickets: 0, description: '', color: '#3B82F6' }
        ]);
        setEditingEventId(null);
        setValidationErrors([]);
        await fetchEvents();
        alert('Event updated successfully!');
      } else {
        setValidationErrors([{
          field: 'submit',
          message: responseData.error || 'Failed to update event'
        }]);
      }
    } catch (error: any) {
      logError('Event update failed', error, { action: 'update-event', eventId: editingEventId });
      setValidationErrors([{
        field: 'submit',
        message: 'Network error occurred while updating event'
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setNewEvent({
      title: '',
      description: '',
      date: '',
      time: '',
      endDate: '',
      location: '',
      venue: '',
      address: '',
      city: '',
      country: '',
      posterImage: '',
      bannerImage: '',
      youtubeTrailer: '',
      category: 'concert',
      ageLimit: '',
      duration: '',
      language: '',
      artists: '',
      organizer: '',
      tags: '',
      metaDescription: '',
      maxCapacity: '',
    });
    setTicketTypes([{ name: 'General Admission', price: 0, capacity: 0, availableTickets: 0, description: '', color: '#3B82F6' }]);
  };

  // Payment Configuration Functions
  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currencyCode] || '$';
  };

  const getCurrencyInfo = (currencyCode: string) => {
    const currencies: { [key: string]: { symbol: string; name: string } } = {
      'USD': { symbol: '$', name: 'US Dollar' },
      'EUR': { symbol: '€', name: 'Euro' },
      'GBP': { symbol: '£', name: 'British Pound' },
      'CAD': { symbol: 'C$', name: 'Canadian Dollar' },
      'AUD': { symbol: 'A$', name: 'Australian Dollar' }
    };
    return currencies[currencyCode] || { symbol: '$', name: 'US Dollar' };
  };

  const savePaymentSettings = async () => {
    try {
      setSettingsLoading(true);
      // Map the field names correctly for the API
      const settingsToSave = {
        stripePublishableKey: paymentSettings.stripePublicKey,
        stripeSecretKey: paymentSettings.stripeSecretKey,
        currency: paymentSettings.currency,
        currencySymbol: paymentSettings.currency === 'eur' ? '€' : '$',
        validationWindowDays: paymentSettings.validationWindowDays,
        validationStartDays: paymentSettings.validationStartDays,
        allowValidationAnytime: paymentSettings.allowValidationAnytime,
        // SMTP Settings
        smtpHost: paymentSettings.smtpHost,
        smtpPort: paymentSettings.smtpPort,
        smtpSecure: paymentSettings.smtpSecure,
        smtpUser: paymentSettings.smtpUser,
        smtpPass: paymentSettings.smtpPass,
        senderEmail: paymentSettings.senderEmail,
        senderName: paymentSettings.senderName
      };

      console.log('💾 Saving payment & SMTP settings:', settingsToSave);

      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });

      if (res.ok) {
        const responseData = await res.json();
        console.log('✅ Payment & SMTP settings saved:', responseData);
        setPaymentSettingsSaved(true);
        // Update global currency context
        setCurrency(paymentSettings.currency);
        alert('Payment & SMTP settings saved successfully! Your email configuration is now active.');
        setTimeout(() => setPaymentSettingsSaved(false), 3000);
        // Refresh settings to show updated values
        fetchPaymentSettings();
      } else {
        const errorData = await res.json();
        console.error('❌ Error saving settings:', errorData);
        alert(`Error saving settings: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving payment settings:', error);
      alert('Error saving payment settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const testStripeConnection = async () => {
    if (!paymentSettings.stripePublicKey) {
      alert('Please enter a Stripe public key first');
      return;
    }

    try {
      const res = await fetch('/api/admin/test-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePublicKey: paymentSettings.stripePublicKey,
          stripeSecretKey: paymentSettings.stripeSecretKey
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('✅ Stripe connection successful!');
      } else {
        alert(`❌ Stripe connection failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing Stripe connection:', error);
      alert('Error testing Stripe connection');
    }
  };

  const testEmailConfiguration = async () => {
    if (!testEmailAddress) {
      alert('Please enter a test email address');
      return;
    }

    if (!paymentSettings.smtpHost || !paymentSettings.smtpUser) {
      alert('Please configure SMTP settings first');
      return;
    }

    setEmailTesting(true);
    setEmailTestResult(null);

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: testEmailAddress,
          smtpSettings: {
            smtpHost: paymentSettings.smtpHost,
            smtpPort: paymentSettings.smtpPort,
            smtpSecure: paymentSettings.smtpSecure,
            smtpUser: paymentSettings.smtpUser,
            smtpPass: paymentSettings.smtpPass,
            senderEmail: paymentSettings.senderEmail,
            senderName: paymentSettings.senderName
          }
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEmailTestResult({
          success: true,
          message: `Test email sent successfully to ${testEmailAddress}. Check your inbox (and spam folder).`
        });
      } else {
        setEmailTestResult({
          success: false,
          message: data.error || 'Failed to send test email. Check server logs for details.'
        });
      }
    } catch (error) {
      console.error('Error testing email configuration:', error);
      setEmailTestResult({
        success: false,
        message: 'Network error while testing email configuration.'
      });
    } finally {
      setEmailTesting(false);
    }
  };

  return (
    <BackgroundWrapper fullHeight={false}>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-white drop-shadow-lg">Admin Panel</h1>

        {error && (
          <div className="bg-red-500/20 backdrop-blur-lg border border-red-400/50 text-white px-4 py-3 rounded-xl mb-4 shadow-xl drop-shadow-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 inline-block border border-white/30">
              <p className="text-white drop-shadow-md">Loading...</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="dashboard" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl">
            <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="events" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <Ticket className="w-4 h-4 mr-2" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">
              <AlertCircle className="w-4 h-4 mr-2" />
              Debug
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stats Cards */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/90">Total Events</p>
                      <p className="text-2xl font-bold text-white">{dashboardStats?.totalEvents || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/90">Total Tickets</p>
                      <p className="text-2xl font-bold text-white">{dashboardStats?.totalTickets || 0}</p>
                    </div>
                    <Ticket className="h-8 w-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/90">Total Revenue</p>
                      <p className="text-2xl font-bold text-white">${dashboardStats?.totalRevenue?.toFixed(2) || '0.00'}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/90">Upcoming Events</p>
                      <p className="text-2xl font-bold text-white">{dashboardStats?.upcomingEvents || 0}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md">Recent Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardStats?.recentTickets?.slice(0, 5).map((ticket) => (
                      <div key={ticket._id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                        <div>
                          <p className="text-white font-medium">
                            {(() => {
                              const event = events.find((e: Event) => e._id === ticket.eventId);
                              return event?.title || 'Unknown Event';
                            })()}
                          </p>
                          <p className="text-white/70 text-sm">User: {ticket.userId}</p>
                        </div>
                        <Badge className={ticket.isValidated ? 'bg-green-600' : 'bg-yellow-600'}>
                          {ticket.isValidated ? 'Validated' : 'Pending'}
                        </Badge>
                      </div>
                    )) || (
                        <p className="text-white/70 text-center py-4">No recent tickets</p>
                      )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setSelectedTab('events')}
                    className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Create New Event
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('users')}
                    className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('analytics')}
                    className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button
                    onClick={() => setSelectedTab('settings')}
                    className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    System Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md">{editingEventId ? 'Edit Event' : 'Create New Event'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={editingEventId ? handleUpdateEvent : handleCreateEvent} className="space-y-6">
                    {/* Validation Errors Display */}
                    {validationErrors.length > 0 && (
                      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm">
                        <div className="flex items-start gap-2">
                          <div className="text-red-400 text-sm">
                            <div className="font-medium mb-2">Please fix the following errors:</div>
                            {validationErrors.map((error, index) => (
                              <div key={index} className="mb-1">• {error.message}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-white">Basic Information</h4>
                      <Input
                        placeholder="Event Title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        required
                      />
                      <Textarea
                        placeholder="Description"
                        value={newEvent.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewEvent({ ...newEvent, description: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        required
                      />
                      <Textarea
                        placeholder="Meta Description (for SEO)"
                        value={newEvent.metaDescription}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewEvent({ ...newEvent, metaDescription: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-white">Date & Time</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-white/90">Start Date & Time</label>
                          <Input
                            type="datetime-local"
                            value={newEvent.date}
                            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                            className="bg-white/20 border-white/30 text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-white/90">End Date & Time (Optional)</label>
                          <Input
                            type="datetime-local"
                            value={newEvent.endDate}
                            onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                            className="bg-white/20 border-white/30 text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-white/90">Duration (minutes)</label>
                          <Input
                            type="number"
                            placeholder="e.g., 120"
                            value={newEvent.duration}
                            onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-white/90">Language</label>
                          <Input
                            placeholder="e.g., English, Turkish"
                            value={newEvent.language}
                            onChange={(e) => setNewEvent({ ...newEvent, language: e.target.value })}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-white">Location</h4>
                      <Input
                        placeholder="Location/Venue Name"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        required
                      />
                      <Input
                        placeholder="Venue Details (Optional)"
                        value={newEvent.venue}
                        onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      />
                      <Input
                        placeholder="Address"
                        value={newEvent.address}
                        onChange={(e) => setNewEvent({ ...newEvent, address: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          placeholder="City"
                          value={newEvent.city}
                          onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                        <Input
                          placeholder="Country"
                          value={newEvent.country}
                          onChange={(e) => setNewEvent({ ...newEvent, country: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                    </div>

                    {/* Media */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-white">Media</h4>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white/90">Poster Image</label>
                        <ImageUpload
                          value={newEvent.posterImage}
                          onChange={(url) => setNewEvent({ ...newEvent, posterImage: url })}
                          folder="posters"
                          placeholder="Poster image"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white/90">Banner Image</label>
                        <ImageUpload
                          value={newEvent.bannerImage}
                          onChange={(url) => setNewEvent({ ...newEvent, bannerImage: url })}
                          folder="banners"
                          placeholder="Banner image"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-white/90">YouTube Trailer URL</label>
                        <Input
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={newEvent.youtubeTrailer}
                          onChange={(e) => setNewEvent({ ...newEvent, youtubeTrailer: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-white">Event Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-white/90">Category</label>
                          <select
                            value={newEvent.category}
                            onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                            className="w-full p-2 border rounded-md bg-white/20 border-white/30 text-white"
                          >
                            <option value="concert" className="text-gray-900">Concert</option>
                            <option value="festival" className="text-gray-900">Festival</option>
                            <option value="theater" className="text-gray-900">Theater</option>
                            <option value="sports" className="text-gray-900">Sports</option>
                            <option value="comedy" className="text-gray-900">Comedy</option>
                            <option value="conference" className="text-gray-900">Conference</option>
                            <option value="other" className="text-gray-900">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-white/90">Age Limit</label>
                          <Input
                            type="number"
                            placeholder="e.g., 18 (0 for all ages)"
                            value={newEvent.ageLimit}
                            onChange={(e) => setNewEvent({ ...newEvent, ageLimit: e.target.value })}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                          />
                        </div>
                      </div>
                      <Input
                        placeholder="Artists (comma separated)"
                        value={newEvent.artists}
                        onChange={(e) => setNewEvent({ ...newEvent, artists: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      />
                      <Input
                        placeholder="Organizer"
                        value={newEvent.organizer}
                        onChange={(e) => setNewEvent({ ...newEvent, organizer: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      />
                      <Input
                        placeholder="Tags (comma separated)"
                        value={newEvent.tags}
                        onChange={(e) => setNewEvent({ ...newEvent, tags: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      />
                    </div>

                    {/* Ticket Types */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-lg text-white">Ticket Types</h4>
                        <Button type="button" onClick={addTicketType} className="bg-white/20 border-white/30 text-white hover:bg-white/30">Add Ticket Type</Button>
                      </div>
                      {ticketTypes.map((ticketType, index) => (
                        <div key={index} className="border border-white/30 p-4 rounded-lg space-y-3 bg-white/10 backdrop-blur-md">
                          <div className="flex justify-between items-center">
                            <h5 className="font-medium text-white">Ticket Type {index + 1}</h5>
                            {ticketTypes.length > 1 && (
                              <Button type="button" variant="destructive" size="sm" onClick={() => removeTicketType(index)}>
                                Remove
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              placeholder="Ticket Name (e.g., VIP, General)"
                              value={ticketType.name}
                              onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                              className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                              required
                            />
                            <Input
                              type="number"
                              placeholder="Price"
                              value={ticketType.price}
                              onChange={(e) => updateTicketType(index, 'price', parseFloat(e.target.value) || 0)}
                              className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              type="number"
                              placeholder="Capacity"
                              value={ticketType.capacity}
                              onChange={(e) => updateTicketType(index, 'capacity', parseInt(e.target.value) || 0)}
                              className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                              required
                            />
                            <Input
                              type="color"
                              value={ticketType.color}
                              onChange={(e) => updateTicketType(index, 'color', e.target.value)}
                              className="bg-white/20 border-white/30 text-white"
                            />
                          </div>
                          <Textarea
                            placeholder="Description (Optional)"
                            value={ticketType.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateTicketType(index, 'description', e.target.value)}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {editingEventId ? 'Updating...' : 'Creating...'}
                          </div>
                        ) : (
                          editingEventId ? 'Update Event' : 'Create Event'
                        )}
                      </Button>
                      {editingEventId && (
                        <Button type="button" variant="outline" onClick={cancelEdit} className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md">Existing Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(events) && events.length > 0 ? (
                      events.map((event) => (
                        <div key={event._id} className="p-4 border border-white/30 rounded-lg space-y-3 bg-white/10 backdrop-blur-md">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-white">{event.title}</h3>
                              <p className="text-white/80">{event.description}</p>
                            </div>
                            {event.posterImage && (
                              <img src={event.posterImage} alt={event.title} className="w-16 h-16 object-cover rounded ml-4" />
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm text-white/90">
                            <div>
                              <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                              <p><strong>Location:</strong> {event.location}</p>
                              <p><strong>Category:</strong> {event.category}</p>
                              {event.organizer && <p><strong>Organizer:</strong> {event.organizer}</p>}
                            </div>
                            <div>
                              {event.ageLimit && <p><strong>Age Limit:</strong> {event.ageLimit}+</p>}
                              {event.duration && <p><strong>Duration:</strong> {event.duration} min</p>}
                              {event.language && <p><strong>Language:</strong> {event.language}</p>}
                              <p><strong>Status:</strong> {event.status}</p>
                            </div>
                          </div>

                          {event.artists && event.artists.length > 0 && (
                            <div className="text-white/90">
                              <strong>Artists:</strong> {event.artists.join(', ')}
                            </div>
                          )}

                          {event.ticketTypes && event.ticketTypes.length > 0 ? (
                            <div>
                              <strong className="text-white">Ticket Types:</strong>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                {event.ticketTypes.map((tt, idx) => (
                                  <div key={idx} className="border border-white/30 p-2 rounded bg-white/10" style={{ borderColor: tt.color }}>
                                    <div className="flex justify-between">
                                      <span className="font-medium text-white">{tt.name}</span>
                                      <span className="text-white">${tt.price}</span>
                                    </div>
                                    <div className="text-sm text-white/70">
                                      Available: {tt.availableTickets}/{tt.capacity}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            // Legacy display for old events
                            event.price !== undefined && event.capacity !== undefined && (
                              <p className="text-white/90">Price: ${event.price} | Available: {event.availableTickets}/{event.capacity}</p>
                            )
                          )}

                          {event.tags && event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {event.tags.map((tag, idx) => (
                                <span key={idx} className="bg-white/20 text-white px-2 py-1 rounded text-xs border border-white/30">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {event.youtubeTrailer && (
                            <div>
                              <a href={event.youtubeTrailer} target="_blank" rel="noopener noreferrer"
                                className="text-purple-300 hover:text-purple-200 text-sm">
                                🎬 Watch Trailer
                              </a>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/30">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                              onClick={() => handleEditEvent(event)}
                            >
                              Edit
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className={`border-white/30 text-white hover:bg-white/30 ${event.status === 'published' ? 'bg-green-600/50' : 'bg-yellow-600/50'
                                }`}
                              onClick={() => toggleEventStatus(event._id, event.status)}
                            >
                              {event.status === 'published' ? (
                                <>
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 mr-1" />
                                  Publish
                                </>
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className={`border-white/30 text-white hover:bg-white/30 ${(event as any).featured ? 'bg-yellow-500/50' : 'bg-white/20'
                                }`}
                              onClick={() => toggleFeaturedEvent(event._id, (event as any).featured || false)}
                            >
                              <Star className={`w-3 h-3 mr-1 ${(event as any).featured ? 'fill-current' : ''}`} />
                              {(event as any).featured ? 'Unfeature' : 'Feature'}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                              onClick={() => duplicateEvent(event)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Duplicate
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteEvent(event._id, event.title)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/70">No events found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-md">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {users
                    .filter(user =>
                      !searchQuery ||
                      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <div key={user._id} className="p-4 border border-white/30 rounded-lg bg-white/10 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <h4 className="font-semibold text-white">
                                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Anonymous User'}
                                </h4>
                                <p className="text-white/80 text-sm">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={user.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}>
                                    {user.role}
                                  </Badge>
                                  <Badge className={user.isActive ? 'bg-green-600' : 'bg-red-600'}>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {user.role !== 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                                onClick={() => promoteUser(user.clerkId)}
                              >
                                <Star className="w-3 h-3 mr-1" />
                                Promote
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className={`border-white/30 text-white hover:bg-white/30 ${user.isActive ? 'bg-red-600/50' : 'bg-green-600/50'
                                }`}
                              onClick={() => toggleUserStatus(user.clerkId, user.isActive)}
                            >
                              {user.isActive ? (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-white/80">
                          <div>
                            <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p><strong>Last Login:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                  {users.length === 0 && (
                    <p className="text-white/70 text-center py-4">No users found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-md">All Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.isArray(tickets) && tickets.length > 0 ? (
                    tickets.map((ticket) => (
                      <div key={ticket._id} className="p-2 border border-white/30 rounded flex justify-between items-center bg-white/10 backdrop-blur-md">
                        <div>
                          <p className="text-white"><strong>Event:</strong>
                            {(() => {
                              const event = events.find((e: Event) => e._id === ticket.eventId);
                              return event?.title || 'Unknown Event';
                            })()}
                          </p>
                          <p className="text-white/80"><strong>User:</strong> {ticket.userId}</p>
                          <p className="text-white/80"><strong>Validated:</strong> {ticket.isValidated ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/60">QR: {ticket.qrCode?.slice(0, 10) || 'N/A'}...</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/70">No tickets found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales Analytics */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Sales Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-white/80">Today&apos;s Sales</span>
                      <span className="text-white font-semibold">$1,240</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-white/80">This Week</span>
                      <span className="text-white font-semibold">$8,960</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-white/80">This Month</span>
                      <span className="text-white font-semibold">$32,140</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-white/80">Total Revenue</span>
                      <span className="text-white font-semibold">$156,890</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Popular Events */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Popular Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Rock Concert 2024</span>
                      <span className="text-white font-semibold">245 tickets</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Tech Conference</span>
                      <span className="text-white font-semibold">189 tickets</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Art Exhibition</span>
                      <span className="text-white font-semibold">156 tickets</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Food Festival</span>
                      <span className="text-white font-semibold">123 tickets</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Registration Trends */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">New Users Today</span>
                      <span className="text-white font-semibold">12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">New Users This Week</span>
                      <span className="text-white font-semibold">89</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">New Users This Month</span>
                      <span className="text-white font-semibold">456</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Total Users</span>
                      <span className="text-white font-semibold">2,847</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Trends */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Average Order Value</span>
                      <span className="text-white font-semibold">$67.50</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Conversion Rate</span>
                      <span className="text-white font-semibold">3.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Revenue Growth</span>
                      <span className="text-green-400 font-semibold">+12.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Monthly Target</span>
                      <span className="text-white font-semibold">$40,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Settings */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Platform Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-white font-medium">Platform Name</label>
                    <Input
                      defaultValue="Biletara"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-white font-medium">Contact Email</label>
                    <Input
                      defaultValue="admin@biletara.com"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-white font-medium">Max Events Per Page</label>
                    <Input
                      type="number"
                      defaultValue="12"
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                  <Button className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30">
                    Save Platform Settings
                  </Button>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Email Notifications</span>
                    <Button variant="outline" size="sm" className="bg-green-600/50 text-white border-white/30">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">New User Alerts</span>
                    <Button variant="outline" size="sm" className="bg-green-600/50 text-white border-white/30">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Event Creation Alerts</span>
                    <Button variant="outline" size="sm" className="bg-green-600/50 text-white border-white/30">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Payment Notifications</span>
                    <Button variant="outline" size="sm" className="bg-green-600/50 text-white border-white/30">
                      Enabled
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Email Configuration Test */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Email & SMTP Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* SMTP Settings */}
                  <div className="bg-white/10 rounded-lg p-4 space-y-4">
                    <h4 className="text-white font-semibold mb-3">SMTP Server Settings</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-white font-medium">SMTP Host</label>
                        <Input
                          placeholder="smtp.gmail.com, smtp-relay.brevo.com, etc."
                          value={paymentSettings.smtpHost}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, smtpHost: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-white font-medium">SMTP Port</label>
                        <Input
                          type="number"
                          placeholder="587, 465, 25"
                          value={paymentSettings.smtpPort}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, smtpPort: parseInt(e.target.value) || 587 })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-white font-medium">SMTP Username</label>
                        <Input
                          placeholder="your-email@domain.com"
                          value={paymentSettings.smtpUser}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, smtpUser: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-white font-medium">SMTP Password</label>
                        <Input
                          type="password"
                          placeholder="Your SMTP password or app-specific password"
                          value={paymentSettings.smtpPass}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, smtpPass: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-white font-medium">Sender Email</label>
                        <Input
                          type="email"
                          placeholder="noreply@yourdomain.com"
                          value={paymentSettings.senderEmail}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, senderEmail: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-white font-medium">Sender Name</label>
                        <Input
                          placeholder="Your App Name"
                          value={paymentSettings.senderName}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, senderName: e.target.value })}
                          className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="smtpSecure"
                        checked={paymentSettings.smtpSecure}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, smtpSecure: e.target.checked })}
                        className="w-4 h-4 text-purple-600 bg-white/20 border-white/30 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="smtpSecure" className="text-white font-medium">
                        Use Secure Connection (SSL/TLS for port 465)
                      </label>
                    </div>
                  </div>

                  {/* Email Test Section */}
                  <div className="bg-white/10 rounded-lg p-4 space-y-4">
                    <h4 className="text-white font-semibold">Test Email Configuration</h4>

                    <div className="space-y-2">
                      <label className="text-white font-medium">Test Email Address</label>
                      <Input
                        type="email"
                        placeholder="Enter email to test configuration..."
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      />
                    </div>

                    <Button
                      onClick={testEmailConfiguration}
                      disabled={!testEmailAddress || emailTesting || !paymentSettings.smtpHost || !paymentSettings.smtpUser}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 font-semibold py-3 shadow-lg"
                    >
                      {emailTesting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending Test Email...
                        </>
                      ) : (
                        <>
                          📧 Send Test Email
                        </>
                      )}
                    </Button>

                    {emailTestResult && (
                      <div className={`p-3 rounded-lg ${emailTestResult.success
                        ? 'bg-green-500/20 border border-green-500/50'
                        : 'bg-red-500/20 border border-red-500/50'
                        }`}>
                        <p className={`font-semibold ${emailTestResult.success ? 'text-green-300' : 'text-red-300'}`}>
                          {emailTestResult.success ? '✅ Success!' : '❌ Failed!'}
                        </p>
                        <p className="text-white/80 text-sm mt-1">
                          {emailTestResult.message}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Save SMTP Settings Button */}
                  <div className="border-t border-white/20 pt-4">
                    <Button
                      onClick={savePaymentSettings}
                      disabled={settingsLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white border border-green-500 font-semibold py-3 shadow-lg disabled:opacity-50"
                    >
                      {settingsLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving Settings...
                        </>
                      ) : (
                        <>
                          💾 Save SMTP Settings
                        </>
                      )}
                    </Button>
                    {paymentSettingsSaved && (
                      <div className="text-green-400 text-sm mt-2 text-center">✅ SMTP settings saved successfully!</div>
                    )}
                  </div>

                  <div className="text-sm text-white/70 space-y-1">
                    <p>📧 <strong>Info:</strong> Configure your SMTP server to send booking confirmations and notifications.</p>
                    <p>🔧 <strong>Providers:</strong> Works with Gmail, Brevo, Mailgun, SendGrid, or any SMTP service.</p>
                    <p>⚙️ <strong>Note:</strong> Save settings first, then test your configuration.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Configuration */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Configuration
                  </CardTitle>
                  {paymentSettingsSaved && (
                    <div className="text-green-400 text-sm">✅ Settings saved successfully!</div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-white font-medium">Stripe Public Key</label>
                    <Input
                      placeholder="pk_test_..."
                      value={paymentSettings.stripePublicKey}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, stripePublicKey: e.target.value })}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-white font-medium">Stripe Secret Key</label>
                    <Input
                      placeholder="sk_test_..."
                      type="password"
                      value={paymentSettings.stripeSecretKey}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, stripeSecretKey: e.target.value })}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-white font-medium">Platform Fee (%)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={paymentSettings.platformFee}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, platformFee: parseFloat(e.target.value) || 0 })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white font-medium">Currency</label>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPaymentSettings({ ...paymentSettings, currency: 'USD' });
                            setCurrency('USD');
                          }}
                          className={`text-xs ${paymentSettings.currency === 'USD'
                            ? 'bg-blue-600/50 text-white border-blue-400'
                            : 'bg-white/20 text-white/80 border-white/30'}`}
                        >
                          $ USD
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPaymentSettings({ ...paymentSettings, currency: 'EUR' });
                            setCurrency('EUR');
                          }}
                          className={`text-xs ${paymentSettings.currency === 'EUR'
                            ? 'bg-blue-600/50 text-white border-blue-400'
                            : 'bg-white/20 text-white/80 border-white/30'}`}
                        >
                          € EUR
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPaymentSettings({ ...paymentSettings, currency: 'GBP' });
                            setCurrency('GBP');
                          }}
                          className={`text-xs ${paymentSettings.currency === 'GBP'
                            ? 'bg-blue-600/50 text-white border-blue-400'
                            : 'bg-white/20 text-white/80 border-white/30'}`}
                        >
                          £ GBP
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <select
                        value={paymentSettings.currency}
                        onChange={(e) => {
                          setPaymentSettings({ ...paymentSettings, currency: e.target.value });
                          setCurrency(e.target.value);
                        }}
                        className="w-full p-2 rounded bg-white/20 border border-white/30 text-white pr-10 appearance-none"
                      >
                        <option value="USD" className="bg-gray-800">USD ($) - US Dollar</option>
                        <option value="EUR" className="bg-gray-800">EUR (€) - Euro</option>
                        <option value="GBP" className="bg-gray-800">GBP (£) - British Pound</option>
                        <option value="CAD" className="bg-gray-800">CAD (C$) - Canadian Dollar</option>
                        <option value="AUD" className="bg-gray-800">AUD (A$) - Australian Dollar</option>
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <span className="text-white/60 text-lg font-bold">
                          {getCurrencySymbol(paymentSettings.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-white/70 mt-1">
                      <span>Selected: </span>
                      <span className="font-semibold text-white">
                        {getCurrencyInfo(paymentSettings.currency).name} ({getCurrencySymbol(paymentSettings.currency)})
                      </span>
                    </div>
                  </div>

                  {/* Ticket Validation Settings */}
                  <div className="border-t border-white/20 pt-4 mt-6">
                    <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      Ticket Validation Settings
                    </h4>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="allowValidationAnytime"
                          checked={paymentSettings.allowValidationAnytime}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            allowValidationAnytime: e.target.checked
                          })}
                          className="rounded border-white/30 bg-white/20 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <label htmlFor="allowValidationAnytime" className="text-white font-medium">
                          Allow validation anytime (override date restrictions)
                        </label>
                      </div>

                      {!paymentSettings.allowValidationAnytime && (
                        <>
                          <div className="space-y-2">
                            <label className="text-white font-medium">Validation Window (days around event)</label>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="30"
                                value={paymentSettings.validationWindowDays}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  validationWindowDays: parseInt(e.target.value) || 1
                                })}
                                className="bg-white/20 border-white/30 text-white placeholder:text-white/60 pr-16"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60">days</span>
                            </div>
                            <p className="text-xs text-white/60">
                              How many days before and after the event date to allow validation
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-white font-medium">Early Validation (days before event)</label>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="30"
                                value={paymentSettings.validationStartDays}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  validationStartDays: parseInt(e.target.value) || 0
                                })}
                                className="bg-white/20 border-white/30 text-white placeholder:text-white/60 pr-16"
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60">days</span>
                            </div>
                            <p className="text-xs text-white/60">
                              How many days before the event to start allowing validation (0 = event day only)
                            </p>
                          </div>

                          <div className="bg-white/10 rounded-lg p-3 mt-3">
                            <p className="text-white/80 text-sm">
                              <strong>Current Settings:</strong><br />
                              {paymentSettings.validationStartDays > 0
                                ? `Validation starts ${paymentSettings.validationStartDays} day(s) before event`
                                : 'Validation starts on event day'
                              }<br />
                              Validation window: ±{paymentSettings.validationWindowDays} day(s) around event date
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t border-white/20">
                    <Button
                      onClick={savePaymentSettings}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white border border-green-500 font-semibold py-3 shadow-lg"
                    >
                      💾 Save Payment Settings
                    </Button>
                    <Button
                      onClick={testStripeConnection}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 font-semibold py-3 shadow-lg"
                    >
                      🔧 Test Stripe Connection
                    </Button>
                  </div>

                  {/* Currency Preview */}
                  <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <span className="text-xl">{getCurrencySymbol(paymentSettings.currency)}</span>
                      Currency Preview
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/70">Example Ticket Price:</p>
                        <p className="text-white text-lg font-semibold">
                          {getCurrencySymbol(paymentSettings.currency)}50.00
                        </p>
                      </div>
                      <div>
                        <p className="text-white/70">Platform Fee ({paymentSettings.platformFee}%):</p>
                        <p className="text-white text-lg font-semibold">
                          {getCurrencySymbol(paymentSettings.currency)}{(50 * paymentSettings.platformFee / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/70">Total to Customer:</p>
                        <p className="text-white text-lg font-semibold">
                          {getCurrencySymbol(paymentSettings.currency)}{(50 + (50 * paymentSettings.platformFee / 100)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/70">You Receive:</p>
                        <p className="text-white text-lg font-semibold">
                          {getCurrencySymbol(paymentSettings.currency)}50.00
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-white/70 space-y-1">
                    <p>💡 <strong>Tip:</strong> Use test keys (pk_test_... and sk_test_...) for development.</p>
                    <p>🔐 <strong>Security:</strong> Secret keys are encrypted when stored.</p>
                  </div>
                </CardContent>
              </Card>

              {/* System Maintenance */}
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    System Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full bg-blue-600/50 hover:bg-blue-600/70 text-white border border-white/30">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear Cache
                  </Button>
                  <Button className="w-full bg-yellow-600/50 hover:bg-yellow-600/70 text-white border border-white/30">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button className="w-full bg-red-600/50 hover:bg-red-600/70 text-white border border-white/30">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Maintenance Mode
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Stripe Webhook Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-300 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Webhook Secret Configured</span>
                    </div>
                    <p className="text-green-200 text-sm">
                      STRIPE_WEBHOOK_SECRET is properly set in your environment variables.
                    </p>
                  </div>

                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-blue-300 font-medium mb-2">Webhook Endpoint URL</h3>
                    <div className="flex items-center gap-2 bg-black/30 rounded p-2">
                      <code className="text-blue-200 text-sm flex-1">
                        {process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/api/webhooks/stripe
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/api/webhooks/stripe`
                          );
                          alert('Webhook URL copied to clipboard!');
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                    <h3 className="text-purple-300 font-medium mb-2">Required Webhook Events</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="bg-black/20 rounded p-2">
                        <code className="text-purple-200 text-xs">payment_intent.succeeded</code>
                      </div>
                      <div className="bg-black/20 rounded p-2">
                        <code className="text-purple-200 text-xs">payment_intent.payment_failed</code>
                      </div>
                      <div className="bg-black/20 rounded p-2">
                        <code className="text-purple-200 text-xs">checkout.session.completed</code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                    <h3 className="text-yellow-300 font-medium mb-2">Setup Instructions</h3>
                    <ol className="text-yellow-200 text-sm space-y-1 list-decimal list-inside">
                      <li>Go to your Stripe Dashboard → Developers → Webhooks</li>
                      <li>Click &quot;Add endpoint&quot; and paste the webhook URL above</li>
                      <li>Select the required events listed above</li>
                      <li>Copy the webhook signing secret to your .env.local file</li>
                      <li>Test the webhook by making a test payment</li>
                    </ol>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-2">Webhook Testing</h3>
                    <p className="text-white/80 text-sm mb-3">
                      When a payment is successful, the webhook will automatically:
                    </p>
                    <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                      <li>Update ticket inventory in the database</li>
                      <li>Create individual tickets with QR codes</li>
                      <li>Mark events as sold-out when appropriate</li>
                      <li>Log the transaction for analytics</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug" className="space-y-6">
            <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Debug Information
                </CardTitle>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={testAPI} className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 border border-white/40">
                    Test API
                  </Button>
                  <Button size="sm" onClick={checkAuth} className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 border border-white/40">
                    Refresh Auth
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client-side Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white mb-3">Client-side Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-white/20">
                        <span className="text-white/80">Authentication Status</span>
                        <span className={`font-semibold ${isSignedIn ? 'text-green-400' : 'text-red-400'}`}>
                          {isSignedIn ? '✅ Signed In' : '❌ Not Signed In'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/20">
                        <span className="text-white/80">User ID</span>
                        <span className="text-white font-mono text-sm">
                          {userId || 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/20">
                        <span className="text-white/80">User Name</span>
                        <span className="text-white">
                          {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-white/80">Admin Status</span>
                        <span className={`font-semibold ${user?.publicMetadata?.role === 'admin' ? 'text-purple-400' : 'text-blue-400'}`}>
                          {user?.publicMetadata?.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Server-side Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white mb-3">Server-side Information</h4>
                    {debugInfo ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-white/20">
                          <span className="text-white/80">Server Authentication</span>
                          <span className={`font-semibold ${debugInfo.authenticated ? 'text-green-400' : 'text-red-400'}`}>
                            {debugInfo.authenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/20">
                          <span className="text-white/80">Server User ID</span>
                          <span className="text-white font-mono text-sm">
                            {debugInfo.userId || 'None'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/20">
                          <span className="text-white/80">Server Admin Status</span>
                          <span className={`font-semibold ${debugInfo.isAdmin ? 'text-purple-400' : 'text-blue-400'}`}>
                            {debugInfo.isAdmin ? '👑 Admin' : '👤 User'}
                          </span>
                        </div>
                        {debugInfo.error && (
                          <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3">
                            <p className="text-red-200 font-semibold">Server Error:</p>
                            <p className="text-red-200 text-sm">{debugInfo.error}</p>
                            {debugInfo.details && (
                              <p className="text-red-200 text-xs mt-1">Details: {debugInfo.details}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-white/70 text-center py-8">
                        <p>No server debug information available.</p>
                        <p className="text-sm mt-2">Click &quot;Refresh Auth&quot; to fetch server data.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Debug Information */}
                <div className="mt-6 pt-6 border-t border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-3">System Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm">Events Loaded</p>
                      <p className="text-white text-xl font-semibold">{Array.isArray(events) ? events.length : 0}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm">Tickets Loaded</p>
                      <p className="text-white text-xl font-semibold">{Array.isArray(tickets) ? tickets.length : 0}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm">Users Loaded</p>
                      <p className="text-white text-xl font-semibold">{Array.isArray(users) ? users.length : 0}</p>
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold text-white mb-3">Payment Configuration Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm">Stripe Public Key</p>
                      <p className={`text-sm font-semibold ${paymentSettings.stripePublicKey ? 'text-green-400' : 'text-red-400'}`}>
                        {paymentSettings.stripePublicKey ? '✅ Configured' : '❌ Not Set'}
                      </p>
                      {paymentSettings.stripePublicKey && (
                        <p className="text-white/60 text-xs font-mono">
                          {paymentSettings.stripePublicKey.substring(0, 12)}...
                        </p>
                      )}
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm">Stripe Secret Key</p>
                      <p className={`text-sm font-semibold ${paymentSettings.stripeSecretKey ? 'text-green-400' : 'text-red-400'}`}>
                        {paymentSettings.stripeSecretKey ? '✅ Configured' : '❌ Not Set'}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm">Platform Fee</p>
                      <p className="text-white text-lg font-semibold">{paymentSettings.platformFee}%</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm">Currency</p>
                      <p className="text-white text-lg font-semibold">
                        {paymentSettings.currency} ({getCurrencySymbol(paymentSettings.currency)})
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BackgroundWrapper>
  );
}
