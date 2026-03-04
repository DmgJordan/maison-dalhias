<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { bookingsApi, type Booking } from '../../lib/api';
import CalendarGrid from '../../components/admin/CalendarGrid.vue';
import BookingSummaryModal from '../../components/admin/BookingSummaryModal.vue';

const bookings = ref<Booking[]>([]);
const loading = ref(true);
const error = ref('');
const selectedBooking = ref<Booking | null>(null);

const fetchBookings = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = '';
    bookings.value = await bookingsApi.getAll();
  } catch (e: unknown) {
    error.value = 'Impossible de charger les réservations';
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const handleBookingClick = (booking: Booking): void => {
  selectedBooking.value = booking;
};

const handleCloseModal = (): void => {
  selectedBooking.value = null;
};

onMounted(() => {
  void fetchBookings();
});
</script>

<template>
  <div class="calendar-view">
    <div v-if="loading" class="loading-container">
      <div class="spinner" />
    </div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <CalendarGrid v-else :bookings="bookings" @booking-click="handleBookingClick" />

    <BookingSummaryModal
      v-if="selectedBooking"
      :booking="selectedBooking"
      @close="handleCloseModal"
    />
  </div>
</template>

<style scoped>
.calendar-view {
  width: 100%;
}

.loading-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e5e5;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-banner {
  padding: 16px;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 12px;
  margin-bottom: 16px;
}
</style>
