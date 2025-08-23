export interface Client {
  id: string
  first_name: string
  last_name: string
  address: string
  city: string
  postal_code: string
  country: string
  phone: string
  created_at: string
}

export interface CreateClientData {
  first_name: string
  last_name: string
  address: string
  city: string
  postal_code: string
  country: string
  phone: string
}