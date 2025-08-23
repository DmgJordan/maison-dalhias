import type { Client, CreateClientData } from './client'

export interface Booking {
  id: string
  start_date: string
  end_date: string
  status: 'pending' | 'confirmed' | 'cancelled'
  user_id: string
  primary_client_id: string
  secondary_client_id?: string
  occupants_count: number
  rental_price: number
  tourist_tax_included: boolean
  cleaning_included: boolean
  linen_included: boolean
  created_at: string
  primary_client?: Client
  secondary_client?: Client
}

export interface CreateBookingData {
  start_date: string
  end_date: string
  primary_client: CreateClientData
  secondary_client: CreateClientData | null
  occupants_count: number
  rental_price: number
  tourist_tax_included: boolean
  cleaning_included: boolean
  linen_included: boolean
}