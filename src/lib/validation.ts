/**
 * Comprehensive validation utilities for SUPERNOVA application
 * Provides both client-side and server-side validation functions
 */

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!email || email.trim() === '') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
    if (email.length > 255) {
      errors.push({ field: 'email', message: 'Email must be less than 255 characters' });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!password || password.trim() === '') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    if (password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
    }
    if (password.length > 128) {
      errors.push({ field: 'password', message: 'Password must be less than 128 characters' });
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number' });
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one special character (@$!%*?&)' });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Name validation
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!name || name.trim() === '') {
    errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} is required` });
  } else {
    if (name.trim().length < 2) {
      errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} must be at least 2 characters long` });
    }
    if (name.length > 100) {
      errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} must be less than 100 characters` });
    }
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(name)) {
      errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Phone number validation
export const validatePhone = (phone: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!phone || phone.trim() === '') {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  } else {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      errors.push({ field: 'phone', message: 'Phone number must be between 10 and 15 digits' });
    }

    // Allow common phone formats
    const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{10,}$/;
    if (!phoneRegex.test(phone)) {
      errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Event validation
export const validateEvent = (event: any): ValidationResult => {
  const errors: ValidationError[] = [];

  // Title validation
  if (!event.title || event.title.trim() === '') {
    errors.push({ field: 'title', message: 'Event title is required' });
  } else if (event.title.length > 200) {
    errors.push({ field: 'title', message: 'Event title must be less than 200 characters' });
  }

  // Description validation
  if (!event.description || event.description.trim() === '') {
    errors.push({ field: 'description', message: 'Event description is required' });
  } else if (event.description.length > 2000) {
    errors.push({ field: 'description', message: 'Event description must be less than 2000 characters' });
  }

  // Date validation
  if (!event.date) {
    errors.push({ field: 'date', message: 'Event date is required' });
  } else {
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(eventDate.getTime())) {
      errors.push({ field: 'date', message: 'Please enter a valid date' });
    } else if (eventDate < today) {
      errors.push({ field: 'date', message: 'Event date cannot be in the past' });
    }
  }

  // Time validation
  if (!event.time || event.time.trim() === '') {
    errors.push({ field: 'time', message: 'Event time is required' });
  } else {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(event.time)) {
      errors.push({ field: 'time', message: 'Please enter a valid time (HH:MM)' });
    }
  }

  // Location validation
  if (!event.location || event.location.trim() === '') {
    errors.push({ field: 'location', message: 'Event location is required' });
  } else if (event.location.length > 200) {
    errors.push({ field: 'location', message: 'Event location must be less than 200 characters' });
  }

  // Venue validation
  if (!event.venue || event.venue.trim() === '') {
    errors.push({ field: 'venue', message: 'Event venue is required' });
  } else if (event.venue.length > 200) {
    errors.push({ field: 'venue', message: 'Event venue must be less than 200 characters' });
  }

  // Category validation
  if (!event.category || event.category.trim() === '') {
    errors.push({ field: 'category', message: 'Event category is required' });
  }

  // Ticket types validation
  if (!event.ticketTypes || !Array.isArray(event.ticketTypes) || event.ticketTypes.length === 0) {
    errors.push({ field: 'ticketTypes', message: 'At least one ticket type is required' });
  } else {
    event.ticketTypes.forEach((ticket: any, index: number) => {
      if (!ticket.name || ticket.name.trim() === '') {
        errors.push({ field: `ticketTypes.${index}.name`, message: `Ticket type ${index + 1} name is required` });
      }
      if (ticket.price === undefined || ticket.price === null || ticket.price < 0) {
        errors.push({ field: `ticketTypes.${index}.price`, message: `Ticket type ${index + 1} must have a valid price` });
      }
      if (!ticket.capacity || ticket.capacity < 1) {
        errors.push({ field: `ticketTypes.${index}.capacity`, message: `Ticket type ${index + 1} must have at least 1 ticket available` });
      }
    });
  }

  return { isValid: errors.length === 0, errors };
};

// Booking validation
export const validateBooking = (booking: any): ValidationResult => {
  const errors: ValidationError[] = [];

  // Customer info validation
  const nameValidation = validateName(booking.customerName, 'Customer name');
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }

  const emailValidation = validateEmail(booking.customerEmail);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }

  if (booking.customerPhone) {
    const phoneValidation = validatePhone(booking.customerPhone);
    if (!phoneValidation.isValid) {
      errors.push(...phoneValidation.errors);
    }
  }

  // Event validation
  if (!booking.eventId) {
    errors.push({ field: 'eventId', message: 'Event ID is required' });
  }

  // Tickets validation
  if (!booking.tickets || !Array.isArray(booking.tickets) || booking.tickets.length === 0) {
    errors.push({ field: 'tickets', message: 'At least one ticket must be selected' });
  } else {
    booking.tickets.forEach((ticket: any, index: number) => {
      if (!ticket.ticketTypeId) {
        errors.push({ field: `tickets.${index}.ticketTypeId`, message: `Ticket ${index + 1} type is required` });
      }
      if (!ticket.quantity || ticket.quantity < 1) {
        errors.push({ field: `tickets.${index}.quantity`, message: `Ticket ${index + 1} quantity must be at least 1` });
      }
      if (ticket.quantity > 10) {
        errors.push({ field: `tickets.${index}.quantity`, message: `Maximum 10 tickets per type allowed` });
      }
    });
  }

  return { isValid: errors.length === 0, errors };
};

// Contact form validation
export const validateContactForm = (contact: any): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameValidation = validateName(contact.name, 'Name');
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }

  const emailValidation = validateEmail(contact.email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }

  if (!contact.subject || contact.subject.trim() === '') {
    errors.push({ field: 'subject', message: 'Subject is required' });
  } else if (contact.subject.length > 200) {
    errors.push({ field: 'subject', message: 'Subject must be less than 200 characters' });
  }

  if (!contact.message || contact.message.trim() === '') {
    errors.push({ field: 'message', message: 'Message is required' });
  } else if (contact.message.length < 10) {
    errors.push({ field: 'message', message: 'Message must be at least 10 characters long' });
  } else if (contact.message.length > 2000) {
    errors.push({ field: 'message', message: 'Message must be less than 2000 characters' });
  }

  return { isValid: errors.length === 0, errors };
};

// Price validation
export const validatePrice = (price: number | string, fieldName: string = 'Price'): ValidationResult => {
  const errors: ValidationError[] = [];

  if (price === null || price === undefined || price === '') {
    errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} is required` });
  } else {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (isNaN(numPrice)) {
      errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} must be a valid number` });
    } else if (numPrice < 0) {
      errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} cannot be negative` });
    } else if (numPrice > 99999.99) {
      errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} cannot exceed €99,999.99` });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// URL validation
export const validateUrl = (url: string, fieldName: string = 'URL'): ValidationResult => {
  const errors: ValidationError[] = [];

  if (url && url.trim() !== '') {
    try {
      new URL(url);
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        errors.push({ field: fieldName.toLowerCase(), message: `${fieldName} must start with http:// or https://` });
      }
    } catch {
      errors.push({ field: fieldName.toLowerCase(), message: `Please enter a valid ${fieldName.toLowerCase()}` });
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Sanitization functions
export const sanitizeString = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
};

export const sanitizeEmail = (email: string): string => {
  if (!email) return '';

  return email
    .trim()
    .toLowerCase()
    .replace(/[^\w@.-]/g, ''); // Keep only valid email characters
};

export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';

  // Keep only digits, spaces, hyphens, parentheses, plus sign, and dots
  return phone.replace(/[^\d\s\-\(\)\+\.]/g, '');
};

// Combine validation results
export const combineValidationResults = (...results: ValidationResult[]): ValidationResult => {
  const allErrors: ValidationError[] = [];

  results.forEach(result => {
    allErrors.push(...result.errors);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

// Format validation errors for display
export const formatValidationErrors = (errors: ValidationError[]): string => {
  if (errors.length === 0) return '';

  if (errors.length === 1) {
    return errors[0].message;
  }

  return errors.map(error => `• ${error.message}`).join('\n');
};

// Server-side validation helper
export const validateAndSanitize = (data: any, validator: (data: any) => ValidationResult) => {
  // First sanitize string fields
  const sanitizedData = { ...data };

  Object.keys(sanitizedData).forEach(key => {
    if (typeof sanitizedData[key] === 'string') {
      if (key.toLowerCase().includes('email')) {
        sanitizedData[key] = sanitizeEmail(sanitizedData[key]);
      } else if (key.toLowerCase().includes('phone')) {
        sanitizedData[key] = sanitizePhone(sanitizedData[key]);
      } else {
        sanitizedData[key] = sanitizeString(sanitizedData[key]);
      }
    }
  });

  // Then validate
  const validation = validator(sanitizedData);

  return {
    data: sanitizedData,
    validation
  };
};