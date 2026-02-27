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
  <div class="success-view">
    <div class="step-content">
      <!-- Checkmark icon -->
      <div class="success-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="success-check"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <!-- Title -->
      <h2 class="success-title">{{ title }}</h2>

      <!-- Booking summary -->
      <div class="recap-section">
        <div class="recap-info">
          <SourceBadge :source="source" :booking-type="bookingType" />
          <span class="recap-dates">
            {{ formatDateShort(startDate) }} — {{ formatDateShort(endDate) }}
          </span>
          <span class="recap-nights"> {{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }} </span>
        </div>
        <p v-if="label" class="recap-label">{{ label }}</p>
      </div>

      <!-- Actions -->
      <div class="step-navigation">
        <button type="button" class="nav-btn nav-btn--prev" @click="emit('backToList')">
          Retour aux réservations
        </button>
        <button type="button" class="nav-btn nav-btn--next" @click="emit('viewBooking')">
          Voir la réservation
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.success-view {
  max-width: 500px;
  margin: 0 auto;
  padding: 48px 16px 40px;
}

.step-content {
  background-color: white;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.success-check {
  width: 32px;
  height: 32px;
  color: white;
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 24px 0;
  text-align: center;
}

.recap-section {
  width: 100%;
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.recap-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.recap-dates {
  font-size: 15px;
  color: #484848;
}

.recap-nights {
  font-size: 14px;
  color: #717171;
}

.recap-label {
  font-size: 14px;
  color: #484848;
  margin: 8px 0 0 0;
}

/* Navigation */
.step-navigation {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
}

.nav-btn--next {
  background-color: #ff385c;
  color: white;
  order: -1;
}

.nav-btn--next:hover {
  background-color: #e31c5f;
}

.nav-btn--prev {
  background-color: #f3f4f6;
  color: #484848;
}

.nav-btn--prev:hover {
  background-color: #e5e5e5;
}

@media (min-width: 768px) {
  .success-view {
    max-width: 600px;
  }
}

@media (min-width: 1024px) {
  .success-view {
    max-width: 700px;
  }

  .step-content {
    padding: 40px 32px;
  }

  .success-title {
    font-size: 24px;
  }

  .step-navigation {
    flex-direction: row;
  }

  .nav-btn {
    flex: 1;
  }

  .nav-btn--next {
    order: unset;
  }
}
</style>
