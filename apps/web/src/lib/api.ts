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
  adultsCount: number;
  rentalPrice: number;
  touristTaxIncluded: boolean;
  cleaningIncluded: boolean;
  linenIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
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
  adultsCount?: number;
  rentalPrice?: number;
  touristTaxIncluded?: boolean;
  cleaningIncluded?: boolean;
  linenIncluded?: boolean;
}

export interface UpdateBookingData {
  startDate?: string;
  endDate?: string;
  primaryClient?: Omit<Client, 'id'>;
  secondaryClient?: Omit<Client, 'id'>;
  occupantsCount?: number;
  adultsCount?: number;
  rentalPrice?: number;
  touristTaxIncluded?: boolean;
  cleaningIncluded?: boolean;
  linenIncluded?: boolean;
  recalculatePrice?: boolean;
}

export interface CreateContactData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// Seasons & Pricing Types
export interface Season {
  id: string;
  name: string;
  pricePerNight: number;
  weeklyNightRate: number | null;
  minNights: number;
  color: string | null;
  order: number;
  datePeriods?: DatePeriodSummary[];
}

export interface DatePeriodSummary {
  id: string;
  startDate: string;
  endDate: string;
  year: number;
}

export interface DatePeriod {
  id: string;
  startDate: string;
  endDate: string;
  year: number;
  season: {
    id: string;
    name: string;
    pricePerNight: number;
    color: string | null;
  };
}

export interface PriceDetail {
  startDate: string;
  endDate: string;
  nights: number;
  seasonId: string;
  seasonName: string;
  pricePerNight: number;
  subtotal: number;
}

export interface PriceCalculation {
  totalPrice: number;
  totalNights: number;
  isWeeklyRate: boolean;
  minNightsRequired: number;
  details: PriceDetail[];
  hasUncoveredDays: boolean;
  uncoveredDays: number;
  defaultPricePerNight: number;
}

export interface PublicPricingPeriod {
  seasonName: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  weeklyPrice: number;
  minNights: number;
  color: string | null;
}

export interface PublicPricingGrid {
  year: number;
  periods: PublicPricingPeriod[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  minNightsRequired: number;
}

export interface Settings {
  defaultPricePerNight: number;
}

// Email Types
export interface EmailLog {
  id: string;
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  documentTypes: ('contract' | 'invoice')[];
  subject: string;
  personalMessage: string | null;
  resendMessageId: string | null;
  status: 'SENT' | 'FAILED';
  sentAt: string;
  failedAt: string | null;
  failureReason: string | null;
  contractSnapshotId: string | null;
  invoiceSnapshotId: string | null;
  createdAt: string;
}

export interface SendDocumentEmailRequest {
  bookingId: string;
  documentTypes: ('contract' | 'invoice')[];
  recipientEmail: string;
  recipientName: string;
  personalMessage?: string;
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

  async update(id: string, data: UpdateBookingData): Promise<Booking> {
    const { data: result } = await api.patch<Booking>(`/bookings/${id}`, data);
    return result;
  },

  async recalculatePrice(id: string): Promise<PriceCalculation> {
    const { data } = await api.post<PriceCalculation>(`/bookings/${id}/recalculate-price`);
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

  async checkConflicts(
    startDate: string,
    endDate: string,
    bookingId?: string
  ): Promise<ConflictCheckResult> {
    const { data } = await api.post<ConflictCheckResult>('/bookings/check-conflicts', {
      startDate,
      endDate,
      bookingId,
    });
    return data;
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

// Seasons API
export const seasonsApi = {
  async getAll(): Promise<Season[]> {
    const { data } = await api.get<Season[]>('/seasons');
    return data;
  },

  async getById(id: string): Promise<Season> {
    const { data } = await api.get<Season>(`/seasons/${id}`);
    return data;
  },

  async create(season: {
    name: string;
    pricePerNight: number;
    weeklyNightRate?: number;
    minNights?: number;
    color?: string;
    order?: number;
  }): Promise<Season> {
    const { data } = await api.post<Season>('/seasons', season);
    return data;
  },

  async update(
    id: string,
    season: Partial<{
      name: string;
      pricePerNight: number;
      weeklyNightRate: number | null;
      minNights: number;
      color: string;
      order: number;
    }>
  ): Promise<Season> {
    const { data } = await api.patch<Season>(`/seasons/${id}`, season);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/seasons/${id}`);
  },
};

// Date Periods API
export const datePeriodsApi = {
  async getAll(): Promise<DatePeriod[]> {
    const { data } = await api.get<DatePeriod[]>('/date-periods');
    return data;
  },

  async getByYear(year: number): Promise<DatePeriod[]> {
    const { data } = await api.get<DatePeriod[]>(`/date-periods?year=${String(year)}`);
    return data;
  },

  async getAvailableYears(): Promise<number[]> {
    const { data } = await api.get<number[]>('/date-periods/years');
    return data;
  },

  async getById(id: string): Promise<DatePeriod> {
    const { data } = await api.get<DatePeriod>(`/date-periods/${id}`);
    return data;
  },

  async create(period: {
    startDate: string;
    endDate: string;
    year: number;
    seasonId: string;
  }): Promise<DatePeriod> {
    const { data } = await api.post<DatePeriod>('/date-periods', period);
    return data;
  },

  async update(
    id: string,
    period: Partial<{ startDate: string; endDate: string; year: number; seasonId: string }>
  ): Promise<DatePeriod> {
    const { data } = await api.patch<DatePeriod>(`/date-periods/${id}`, period);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/date-periods/${id}`);
  },

  async copyFromYear(sourceYear: number, targetYear: number): Promise<{ copiedCount: number }> {
    const { data } = await api.post<{ copiedCount: number }>('/date-periods/copy', {
      sourceYear,
      targetYear,
    });
    return data;
  },
};

// Pricing API
export const pricingApi = {
  async calculate(startDate: string, endDate: string): Promise<PriceCalculation> {
    const { data } = await api.post<PriceCalculation>('/pricing/calculate', {
      startDate,
      endDate,
    });
    return data;
  },

  async getPublicGrid(year: number): Promise<PublicPricingGrid> {
    const { data } = await api.get<PublicPricingGrid>(`/pricing/public-grid?year=${String(year)}`);
    return data;
  },

  async getMinNights(startDate: string, endDate: string): Promise<number> {
    const { data } = await api.get<{ minNights: number }>(
      `/pricing/min-nights?startDate=${startDate}&endDate=${endDate}`
    );
    return data.minNights;
  },
};

// Settings API
export const settingsApi = {
  async get(): Promise<Settings> {
    const { data } = await api.get<Settings>('/settings');
    return data;
  },

  async update(settings: Partial<Settings>): Promise<Settings> {
    const { data } = await api.patch<Settings>('/settings', settings);
    return data;
  },
};

// Email API
export const emailApi = {
  async send(data: SendDocumentEmailRequest): Promise<EmailLog> {
    const { data: result } = await api.post<EmailLog>('/emails/send', data);
    return result;
  },

  async getByBooking(bookingId: string): Promise<EmailLog[]> {
    const { data } = await api.get<EmailLog[]>(`/emails/booking/${bookingId}`);
    return data;
  },
};

export default api;
