<script setup lang="ts">
import type { BookingType } from '../../lib/api';
import SourceBadge from './SourceBadge.vue';
import { formatDateShort } from '../../utils/formatting';

interface Props {
  title: string;
  bookingId: string;
  source: string;
  bookingType: BookingType;
  startDate: string;
  endDate: string;
  nightsCount: number;
  label: string | null;
}

defineProps<Props>();
const emit = defineEmits<{ viewBooking: []; backToList: [] }>();
</script>

<template>
  <div class="flex flex-col items-center px-4 py-12">
    <!-- Checkmark icon -->
    <div
      class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"
    >
      <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <!-- Title -->
    <h2 class="mt-4 text-xl font-bold text-dark">{{ title }}</h2>

    <!-- Booking summary -->
    <div class="mt-6 w-full max-w-sm rounded-xl bg-gray-50 p-4">
      <div class="flex items-center gap-3">
        <SourceBadge :source="source" :booking-type="bookingType" />
        <span class="text-sm text-dark">
          {{ formatDateShort(startDate) }} — {{ formatDateShort(endDate) }}
        </span>
        <span class="text-sm text-gray-500">
          {{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}
        </span>
      </div>
      <p v-if="label" class="mt-2 text-sm text-text">{{ label }}</p>
    </div>

    <!-- Actions -->
    <div class="mt-8 flex w-full max-w-sm flex-col gap-3">
      <button
        type="button"
        class="w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary/90"
        style="min-height: 48px"
        @click="emit('viewBooking')"
      >
        Voir la réservation
      </button>
      <button
        type="button"
        class="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-dark transition-colors hover:bg-gray-50"
        style="min-height: 48px"
        @click="emit('backToList')"
      >
        Retour aux réservations
      </button>
    </div>
  </div>
</template>
