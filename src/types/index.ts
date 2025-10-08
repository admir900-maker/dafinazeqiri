export interface User {
  id: string
  email: string
  name: string
  image?: string
  role: 'user' | 'admin'
  createdAt: Date
  updatedAt: Date
}

export interface Event {
  id: string
  title: string
  description: string
  artist: string
  venue: string
  address: string
  date: Date
  startTime: string
  endTime: string
  category: string
  price: number
  currency: string
  totalTickets: number
  availableTickets: number
  image?: string
  images: string[]
  status: 'draft' | 'published' | 'cancelled' | 'sold_out'
  featured: boolean
  tags: string[]
  organizerId: string
  organizer: User
  createdAt: Date
  updatedAt: Date
}

export interface Ticket {
  id: string
  eventId: string
  event: Event
  userId: string
  user: User
  quantity: number
  totalPrice: number
  currency: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
  qrCode?: string
  ticketNumber: string
  purchaseDate: Date
  paymentId?: string
  seatNumbers?: string[]
}

export interface Payment {
  id: string
  userId: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethod: 'stripe' | 'paypal'
  transactionId: string
  tickets: Ticket[]
  createdAt: Date
}

export interface Review {
  id: string
  eventId: string
  userId: string
  user: User
  rating: number
  comment: string
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}