<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { BookingType } from '../../lib/api';
import { useQuickBookingFormStore } from '../../stores/quickBookingForm';
import SuccessScreen from '../../components/admin/SuccessScreen.vue';

const router = useRouter();
const store = useQuickBookingFormStore();

interface BookingSuccessData {
  bookingId: string;
  source: string;
  bookingType: BookingType;
  startDate: string;
  endDate: string;
  nightsCount: number;
  label: string | null;
}

const bookingData = ref<BookingSuccessData | null>(null);

onMounted(() => {
  const state = window.history.state as Record<string, unknown> | null;

  if (state?.bookingId) {
    bookingData.value = {
      bookingId: state.bookingId as string,
      source: state.source as string,
      bookingType: state.bookingType as BookingType,
      startDate: state.startDate as string,
      endDate: state.endDate as string,
      nightsCount: state.nightsCount as number,
      label: (state.label as string | null) ?? null,
    };
    store.$reset();
  } else {
    router.replace({ name: 'AdminBookings' });
  }
});

function viewBooking(): void {
  if (bookingData.value) {
    router.push({ name: 'AdminBookingDetail', params: { id: bookingData.value.bookingId } });
  }
}

function backToList(): void {
  router.push({ name: 'AdminBookings' });
}
</script>

<template>
  <SuccessScreen
    v-if="bookingData"
    title="Réservation créée !"
    :booking-id="bookingData.bookingId"
    :source="bookingData.source"
    :booking-type="bookingData.bookingType"
    :start-date="bookingData.startDate"
    :end-date="bookingData.endDate"
    :nights-count="bookingData.nightsCount"
    :label="bookingData.label"
    @view-booking="viewBooking"
    @back-to-list="backToList"
  />
</template>
