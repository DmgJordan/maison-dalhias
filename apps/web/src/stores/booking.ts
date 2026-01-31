import { defineStore } from 'pinia';
import { bookingsApi, type Booking } from '../lib/api';

interface BookingState {
  bookings: Booking[];
  bookedDates: string[];
  loading: boolean;
  error: string | null;
}

export const useBookingStore = defineStore('booking', {
  state: (): BookingState => ({
    bookings: [],
    bookedDates: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchBookings() {
      this.loading = true;
      try {
        this.bookings = await bookingsApi.getAll();
        this.error = null;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async fetchBookedDates() {
      this.loading = true;
      try {
        this.bookedDates = await bookingsApi.getBookedDates();
        this.error = null;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async checkConflicts(startDate: string, endDate: string): Promise<boolean> {
      try {
        return await bookingsApi.checkConflicts(startDate, endDate);
      } catch (error) {
        this.error = (error as Error).message;
        return true;
      }
    },
  },
});
