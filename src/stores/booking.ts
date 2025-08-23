import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    availabilities: [],
    properties: [],
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchProperties() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
        
        if (error) throw error
        this.properties = data
      } catch (error) {
        this.error = error.message
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
        this.availabilities = data
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    }
  }
})