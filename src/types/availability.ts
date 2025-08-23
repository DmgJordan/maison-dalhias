export interface Availability {
  id: string
  date: string
  available: boolean
  created_at: string
}

export interface CalendarDay {
  date: Date | null
  isCurrentMonth: boolean
  isBooked: boolean
  isAvailable: boolean
}