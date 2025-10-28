'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  BookOpen,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  Save,
  X,
  Palette,
  Tag
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

interface TicketTypeFormData {
  name: string;
  price: string;
  capacity: string;
  description: string;
  color: string;
}

export default function TicketsManagementPage() {
  const { user, isLoaded } = useUser();
  const { formatPrice } = useCurrency();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<TicketTypeFormData>({
    name: '',
    price: '',
    capacity: '',
    description: '',
    color: '#3B82F6'
  });

  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Bronze', value: '#CD7F32' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Gray', value: '#6B7280' }
  ];

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

  const saveTicketType = async () => {
    if (!selectedEvent) return;

    try {
      console.log('💾 Saving ticket type...');

      const ticketData = {
        name: formData.name,
        price: parseFloat(formData.price),
        capacity: parseInt(formData.capacity),
        availableTickets: parseInt(formData.capacity), // Initially set to full capacity
        description: formData.description,
        color: formData.color
      };

      // Validate data
      if (!ticketData.name || ticketData.price < 0 || ticketData.capacity < 1) {
        setMessage('Please fill in all required fields with valid values');
        return;
      }

      const response = await fetch(`/api/admin/events/${selectedEvent._id}/tickets`, {
        method: editingTicket ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketType: ticketData,
          ticketId: editingTicket?._id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save ticket type');
      }

      const updatedEvent = await response.json();
      console.log('✅ Ticket type saved successfully');

      // Update the events list
      setEvents(events.map(event =>
        event._id === selectedEvent._id ? updatedEvent : event
      ));

      // Update selected event
      setSelectedEvent(updatedEvent);

      setMessage(`Ticket type ${editingTicket ? 'updated' : 'created'} successfully`);
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('❌ Error saving ticket type:', error);
      setMessage('Failed to save ticket type');
    }
  };

  const deleteTicketType = async (ticketId: string) => {
    if (!selectedEvent || !confirm('Are you sure you want to delete this ticket type?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting ticket type...');

      const response = await fetch(`/api/admin/events/${selectedEvent._id}/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete ticket type');
      }

      const updatedEvent = await response.json();
      console.log('✅ Ticket type deleted successfully');

      // Update the events list
      setEvents(events.map(event =>
        event._id === selectedEvent._id ? updatedEvent : event
      ));

      // Update selected event
      setSelectedEvent(updatedEvent);

      setMessage('Ticket type deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting ticket type:', error);
      setMessage('Failed to delete ticket type');
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
  };

  const openEditForm = (ticket: TicketType) => {
    setFormData({
      name: ticket.name,
      price: ticket.price.toString(),
      capacity: ticket.capacity.toString(),
      description: ticket.description || '',
      color: ticket.color
    });
    setEditingTicket(ticket);
    setShowForm(true);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">{message}</p>
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
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
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
                  <BookOpen className="h-5 w-5" />
                  Ticket Types
                </div>
                {selectedEvent && (
                  <Button onClick={openCreateForm} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ticket Type
                  </Button>
                )}
              </AdminCardTitle>
            </AdminCardHeader>
            <AdminCardContent>
              {!selectedEvent ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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

                  {/* Ticket Types List */}
                  {selectedEvent.ticketTypes?.length === 0 ? (
                    <div className="text-center py-8">
                      <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Ticket Types</h3>
                      <p className="text-gray-500 mb-4">Add ticket types to start selling tickets for this event.</p>
                      <Button onClick={openCreateForm}>
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
                                onClick={() => openEditForm(ticket)}
                                size="sm"
                                variant="outline"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => deleteTicketType(ticket._id!)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
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

        {/* Ticket Type Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingTicket ? 'Edit Ticket Type' : 'Add Ticket Type'}
                  </h2>
                  <Button
                    onClick={() => setShowForm(false)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Ticket Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., General Admission, VIP, Early Bird"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price (€) *</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="capacity">Capacity *</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description of this ticket type..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="color">Color</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-full h-10 rounded-lg border-2 transition-all ${formData.color === color.value
                              ? 'border-gray-900 scale-95'
                              : 'border-gray-300 hover:border-gray-400'
                            }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={saveTicketType} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingTicket ? 'Update' : 'Create'} Ticket Type
                    </Button>
                    <Button
                      onClick={() => setShowForm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}