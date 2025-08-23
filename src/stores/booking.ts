import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import type { Booking, Client, Availability, Property, LoadingState, ErrorState } from '../types'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    availabilities: [] as Availability[],
    properties: [] as Property[],
    bookings: [] as Booking[],
    clients: [] as Client[],
    loading: false as LoadingState,
    error: null as ErrorState
  }),
  
  actions: {
    async fetchProperties() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
        
        if (error) throw error
        this.properties = data || []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Une erreur est survenue'
      } finally {
        this.loading = false
      }
    },

    async checkAvailability(startDate: string, endDate: string) {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('availability')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
        
        if (error) throw error
        this.availabilities = data || []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Une erreur est survenue'
      } finally {
        this.loading = false
      }
    },

    async fetchBookings() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            primary_client:clients!bookings_primary_client_id_fkey(*),
            secondary_client:clients!bookings_secondary_client_id_fkey(*)
          `)
          .order('start_date', { ascending: true })
        
        if (error) throw error
        this.bookings = data || []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Une erreur est survenue'
      } finally {
        this.loading = false
      }
    },

    async fetchClients() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('last_name', { ascending: true })
        
        if (error) throw error
        this.clients = data || []
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Une erreur est survenue'
      } finally {
        this.loading = false
      }
    },

    async checkBookingConflicts(startDate: string, endDate: string, bookingId?: string): Promise<boolean> {
      try {
        const { data, error } = await supabase.rpc('check_booking_conflicts', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_booking_id: bookingId || null
        })
        
        if (error) throw error
        return data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Une erreur est survenue'
        return false
      }
    },

    async deleteBooking(id: string) {
      try {
        this.loading = true
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Rafraîchir les réservations
        await this.fetchBookings()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Une erreur est survenue'
        throw error
      } finally {
        this.loading = false
      }
    },

    async confirmBooking(id: string) {
      try {
        this.loading = true
        const { error } = await supabase.rpc('confirm_booking', { booking_id: id })
        
        if (error) throw error
        
        // Rafraîchir les réservations
        await this.fetchBookings()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Une erreur est survenue'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})