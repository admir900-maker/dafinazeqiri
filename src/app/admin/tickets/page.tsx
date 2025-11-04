'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  RefreshCw,
  Tag,
  Save,
  X
} from 'lucide-react';
import { AdminCard, AdminCardHeader, AdminCardTitle, AdminCardContent } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TicketType {
  _id?: string;
  name: string;
  price: number;
  capacity: number;
  availableTickets: number;
  description?: string;
  color: string;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  ticketTypes: TicketType[];
  category?: {
    name: string;
  };
}

export default function TicketsManagementPage() {
  const { user, isLoaded } = useUser();
  const { formatPrice } = useCurrency();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    capacity: '',
    description: '',
    color: '#3B82F6'
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching events for ticket management...');

      const response = await fetch('/api/admin/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      console.log('✅ Found', data.events?.length || 0, 'events');
      setEvents(data.events || []);
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      setMessage('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      capacity: '',
      description: '',
      color: '#3B82F6'
    });
    setEditingTicket(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      const ticketData = {
        name: formData.name,
        price: parseFloat(formData.price),
        capacity: parseInt(formData.capacity),
        description: formData.description,
        color: formData.color
      };

      const url = editingTicket
        ? `/api/admin/events/${selectedEvent._id}/tickets/${editingTicket._id}`
        : `/api/admin/events/${selectedEvent._id}/tickets`;

      const method = editingTicket ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        throw new Error('Failed to save ticket type');
      }

      const result = await response.json();
      setMessage(`Ticket type ${editingTicket ? 'updated' : 'added'} successfully!`);

      // Update the selected event with new data
      setSelectedEvent(result.event);

      // Update the events list
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === selectedEvent._id ? result.event : event
        )
      );

      resetForm();
    } catch (error) {
      console.error('Error saving ticket type:', error);
      setMessage('Failed to save ticket type');
    }
  };

  const handleEdit = (ticket: TicketType) => {
    setFormData({
      name: ticket.name,
      price: ticket.price.toString(),
      capacity: ticket.capacity.toString(),
      description: ticket.description || '',
      color: ticket.color
    });
    setEditingTicket(ticket);
    setShowAddForm(true);
  };

  const handleDelete = async (ticketId: string) => {
    if (!selectedEvent || !confirm('Are you sure you want to delete this ticket type?')) return;

    try {
      const response = await fetch(`/api/admin/events/${selectedEvent._id}/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete ticket type');
      }

      const result = await response.json();
      setMessage('Ticket type deleted successfully!');

      // Update the selected event
      setSelectedEvent(result.event);

      // Update the events list
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === selectedEvent._id ? result.event : event
        )
      );
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      setMessage('Failed to delete ticket type');
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchEvents();
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticket Management</h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cd7f32] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tickets...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Access denied. Please sign in.</p>
      </div>
    );
  }

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticket Management</h1>
          <p className="text-gray-600">Manage ticket types and pricing for events</p>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-6 p-4 bg-orange-50 border border-[#cd7f32] rounded-md">
            <p className="text-[#b4530a]">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events List */}
          <AdminCard>
            <AdminCardHeader>
              <AdminCardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events ({filteredEvents.length})
              </AdminCardTitle>
            </AdminCardHeader>
            <AdminCardContent>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Events List */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#cd7f32] mr-2" />
                  <span>Loading events...</span>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                  <p className="text-gray-500">Create some events first to manage their tickets.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredEvents.map((event) => (
                    <div
                      key={event._id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedEvent?._id === event._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                          {event.category && (
                            <Badge variant="secondary" className="mt-1">
                              {event.category.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {event.ticketTypes?.length || 0} ticket types
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminCardContent>
          </AdminCard>

          {/* Ticket Types Management */}
          <AdminCard>
            <AdminCardHeader>
              <AdminCardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Ticket Types
                </div>
                {selectedEvent && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddForm(true)}
                    disabled={showAddForm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ticket Type
                  </Button>
                )}
              </AdminCardTitle>
            </AdminCardHeader>
            <AdminCardContent>
              {!selectedEvent ? (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Event</h3>
                  <p className="text-gray-500">Choose an event from the list to manage its ticket types.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900">{selectedEvent.title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedEvent.date).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Add/Edit Form */}
                  {showAddForm && (
                    <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900">
                          {editingTicket ? 'Edit Ticket Type' : 'Add New Ticket Type'}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetForm}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Ticket Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g., General Admission"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="price">Price (€) *</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.price}
                              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="capacity">Capacity *</Label>
                            <Input
                              id="capacity"
                              type="number"
                              min="1"
                              value={formData.capacity}
                              onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                              placeholder="100"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="color">Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                id="color"
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                              />
                              <Input
                                value={formData.color}
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                placeholder="#3B82F6"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Optional description for this ticket type"
                            rows={3}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="submit">
                            <Save className="h-4 w-4 mr-2" />
                            {editingTicket ? 'Update' : 'Add'} Ticket Type
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Ticket Types List */}
                  {selectedEvent.ticketTypes?.length === 0 ? (
                    <div className="text-center py-8">
                      <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Ticket Types</h3>
                      <p className="text-gray-500 mb-4">Add ticket types to start selling tickets for this event.</p>
                      <Button onClick={() => setShowAddForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Ticket Type
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedEvent.ticketTypes?.map((ticket) => (
                        <div
                          key={ticket._id}
                          className="p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: ticket.color }}
                                ></div>
                                <h4 className="font-medium text-gray-900">{ticket.name}</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Price:</span> {formatPrice(ticket.price)}
                                </div>
                                <div>
                                  <span className="font-medium">Capacity:</span> {ticket.capacity}
                                </div>
                                <div>
                                  <span className="font-medium">Available:</span> {ticket.availableTickets}
                                </div>
                                <div>
                                  <span className="font-medium">Sold:</span> {ticket.capacity - ticket.availableTickets}
                                </div>
                              </div>
                              {ticket.description && (
                                <p className="mt-2 text-sm text-gray-600">{ticket.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(ticket)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(ticket._id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </AdminCardContent>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}