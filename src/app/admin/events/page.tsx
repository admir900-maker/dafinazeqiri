'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Calendar,
  MapPin,
  Save,
  X,
  Image,
  Video,
  FileImage
} from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  address?: string;
  city?: string;
  country?: string;
  category: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  } | string;
  image: string;
  posterImage?: string;
  bannerImage?: string;
  youtubeTrailer?: string;
  isActive: boolean;
  ticketsSold: number;
}

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  category: string;
  image: string;
  posterImage: string;
  bannerImage: string;
  youtubeTrailer: string;
}

export default function EventsManagementPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    address: '',
    city: '',
    country: '',
    category: '',
    image: '',
    posterImage: '',
    bannerImage: '',
    youtubeTrailer: ''
  });

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      Promise.all([fetchEvents(), fetchCategories()]).finally(() => setLoading(false));
    }
  }, [isLoaded, user]);

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof event.category === 'string'
      ? event.category.toLowerCase().includes(searchTerm.toLowerCase())
      : event.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingEvent ? 'PUT' : 'POST';
      const url = editingEvent ? `/api/admin/events/${editingEvent._id}` : '/api/admin/events';

      // Map venue to location for API compatibility
      const submitData = {
        ...formData,
        location: formData.venue, // Map venue to location for validation
        venue: formData.venue,     // Keep venue for the model
        address: formData.address,
        city: formData.city,
        country: formData.country
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        await fetchEvents();
        resetForm();
        alert(editingEvent ? 'Event updated successfully!' : 'Event created successfully!');
      } else {
        // Show detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
          alert(`Validation errors:\n${data.details.join('\n')}`);
        } else {
          alert(data.error || 'Failed to save event');
        }
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          await fetchEvents();
          alert('Event deleted successfully!');
        } else {
          alert(data.error || 'Failed to delete event');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
      }
    }
  };

  const toggleEventStatus = async (eventId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      const data = await response.json();

      if (data.success) {
        await fetchEvents();
        alert(`Event ${!isActive ? 'activated' : 'deactivated'} successfully!`);
      } else {
        alert(data.error || 'Failed to update event status');
      }
    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Failed to update event status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      venue: '',
      address: '',
      city: '',
      country: '',
      category: '',
      image: '',
      posterImage: '',
      bannerImage: '',
      youtubeTrailer: ''
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const startEdit = (event: Event) => {
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date.split('T')[0],
      time: event.time,
      venue: event.venue,
      address: event.address || '',
      city: event.city || '',
      country: event.country || '',
      category: typeof event.category === 'string' ? event.category : (event.category as any)?._id || event.category,
      image: event.image,
      posterImage: event.posterImage || '',
      bannerImage: event.bannerImage || '',
      youtubeTrailer: event.youtubeTrailer || ''
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Events Management</h1>
        </div>
        <div className="flex items-center justify-center min-h-96 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Events Management</h1>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Search and Filters */}
      <AdminCard>
        <AdminCardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-gray-300"
              />
            </div>
            <Button className="bg-[#cd7f32] text-white hover:bg-[#b4530a]">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Event Form Modal */}
      {showForm && (
        <AdminCard>
          <AdminCardHeader>
            <div className="flex items-center justify-between">
              <AdminCardTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </AdminCardTitle>
              <Button
                onClick={resetForm}
                className="bg-gray-600 text-white hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </AdminCardHeader>
          <AdminCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-900 text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-900 text-sm font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-white text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="bg-white/20 border-white/30 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="bg-white/20 border-white/30 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium">Venue</label>
                  <Input
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="e.g., National Arena"
                    required
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium">Address</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="e.g., 123 Main Street"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="e.g., Pristina"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium">Country</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="e.g., Kosovo"
                  />
                </div>
              </div>



              <div>
                <label className="text-white text-sm font-medium">Event Image</label>
                <ImageUpload
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                />
              </div>

              {/* Media Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-white/20 pb-2 flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  Media & Content
                </h3>

                <div>
                  <label className="text-white text-sm font-medium flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Poster Image
                  </label>
                  <p className="text-white/60 text-xs mb-2">Main promotional image for the event</p>
                  <ImageUpload
                    value={formData.posterImage}
                    onChange={(url) => setFormData({ ...formData, posterImage: url })}
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Banner Image
                  </label>
                  <p className="text-white/60 text-xs mb-2">Wide banner image for event headers</p>
                  <ImageUpload
                    value={formData.bannerImage}
                    onChange={(url) => setFormData({ ...formData, bannerImage: url })}
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    YouTube Trailer
                  </label>
                  <p className="text-white/60 text-xs mb-2">YouTube video URL for event promotion</p>
                  <Input
                    type="url"
                    value={formData.youtubeTrailer}
                    onChange={(e) => setFormData({ ...formData, youtubeTrailer: e.target.value })}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <AdminCard key={event._id}>
            <AdminCardContent className="p-4">
              <div className="space-y-3">
                {event.image && (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}

                <div className="flex items-start justify-between">
                  <h3 className="text-white font-semibold text-lg truncate">{event.title}</h3>
                  <Badge variant={event.isActive ? 'default' : 'secondary'}>
                    {event.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <p className="text-white/70 text-sm line-clamp-2">{event.description}</p>

                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()} at {event.time}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {event.venue}
                  </div>
                </div>

                {/* Media Indicators */}
                {(event.posterImage || event.bannerImage || event.youtubeTrailer) && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/60">Media:</span>
                    {event.posterImage && (
                      <Badge variant="outline" className="text-xs border-green-400 text-green-400">
                        <Image className="w-3 h-3 mr-1" />
                        Poster
                      </Badge>
                    )}
                    {event.bannerImage && (
                      <Badge variant="outline" className="text-xs border-[#cd7f32] text-[#cd7f32]">
                        <FileImage className="w-3 h-3 mr-1" />
                        Banner
                      </Badge>
                    )}
                    {event.youtubeTrailer && (
                      <Badge variant="outline" className="text-xs border-red-400 text-red-400">
                        <Video className="w-3 h-3 mr-1" />
                        Trailer
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => startEdit(event)}
                    className="flex-1 bg-[#cd7f32] hover:bg-[#b4530a] text-white text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => toggleEventStatus(event._id, event.isActive)}
                    className="flex-1 bg-orange-700 hover:bg-orange-800 text-white text-xs"
                  >
                    {event.isActive ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                    {event.isActive ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    onClick={() => handleDelete(event._id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <AdminCard>
          <AdminCardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No events found. Create your first event!</p>
          </AdminCardContent>
        </AdminCard>
      )}
    </div>
  );
}