// Types centralisés pour l'application
export type { Client, CreateClientData } from './client'
export type { Booking, CreateBookingData } from './booking'
export type { Availability, CalendarDay } from './availability'
export type { Property } from './property'

// Types communs
export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface ContactForm {
  id: string
  name: string
  email: string
  subject: string
  message: string
  phone: string
  created_at: string
  status: 'sent' | 'read'
}

// Types utilitaires
export type LoadingState = boolean
export type ErrorState = string | null