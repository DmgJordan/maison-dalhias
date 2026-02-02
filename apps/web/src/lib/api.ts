import axios, { AxiosError } from 'axios';

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  userId: string;
  primaryClient?: Client;
  secondaryClient?: Client;
  occupantsCount: number;
  rentalPrice: number;
  touristTaxIncluded: boolean;
  cleaningIncluded: boolean;
  linenIncluded: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface ContactForm {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface CreateBookingData {
  startDate: string;
  endDate: string;
  primaryClient?: Omit<Client, 'id'>;
  secondaryClient?: Omit<Client, 'id'>;
  occupantsCount?: number;
  rentalPrice?: number;
  touristTaxIncluded?: boolean;
  cleaningIncluded?: boolean;
  linenIncluded?: boolean;
}

export interface CreateContactData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// Auth API
export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  getUser(): User | null {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  },
};

// Bookings API
export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    const { data } = await api.get<Booking[]>('/bookings');
    return data;
  },

  async getById(id: string): Promise<Booking> {
    const { data } = await api.get<Booking>(`/bookings/${id}`);
    return data;
  },

  async getBookedDates(): Promise<string[]> {
    const { data } = await api.get<string[]>('/bookings/dates');
    return data;
  },

  async create(booking: CreateBookingData): Promise<Booking> {
    const { data } = await api.post<Booking>('/bookings', booking);
    return data;
  },

  async confirm(id: string): Promise<Booking> {
    const { data } = await api.patch<Booking>(`/bookings/${id}/confirm`);
    return data;
  },

  async cancel(id: string): Promise<Booking> {
    const { data } = await api.patch<Booking>(`/bookings/${id}/cancel`);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/bookings/${id}`);
  },

  async checkConflicts(startDate: string, endDate: string, bookingId?: string): Promise<boolean> {
    const { data } = await api.post<{ hasConflict: boolean }>('/bookings/check-conflicts', {
      startDate,
      endDate,
      bookingId,
    });
    return data.hasConflict;
  },
};

// Contacts API
export const contactsApi = {
  async getAll(): Promise<ContactForm[]> {
    const { data } = await api.get<ContactForm[]>('/contacts');
    return data;
  },

  async create(contact: CreateContactData): Promise<ContactForm> {
    const { data } = await api.post<ContactForm>('/contacts', contact);
    return data;
  },

  async markAsRead(id: string): Promise<ContactForm> {
    const { data } = await api.patch<ContactForm>(`/contacts/${id}/read`);
    return data;
  },
};

export default api;
