<script setup lang="ts">
import { computed } from 'vue';
import type { BookingStatus, BookingType } from '../../lib/api';
import { STATUS_CONFIG } from '../../constants/booking';

interface Props {
  status: BookingStatus;
  bookingType: BookingType;
}

const props = defineProps<Props>();

const steps = computed((): BookingStatus[] => {
  if (props.bookingType === 'DIRECT') {
    return ['DRAFT', 'VALIDATED', 'CONTRACT_SENT', 'DEPOSIT_PAID', 'FULLY_PAID'];
  }
  return ['DRAFT', 'VALIDATED'];
});

const currentStepIndex = computed((): number => {
  return steps.value.indexOf(props.status);
});

const isCancelled = computed((): boolean => {
  return props.status === 'CANCELLED';
});

const getStepState = (index: number): 'completed' | 'active' | 'future' | 'cancelled' => {
  if (isCancelled.value) return 'cancelled';
  if (index < currentStepIndex.value) return 'completed';
  if (index === currentStepIndex.value) return 'active';
  return 'future';
};

const getStepColor = (index: number): string => {
  const state = getStepState(index);
  if (state === 'completed') return '#10b981';
  if (state === 'active') return STATUS_CONFIG[props.status].color;
  if (state === 'cancelled') return '#d1d5db';
  return '#d1d5db';
};

const getLineColor = (index: number): string => {
  if (isCancelled.value) return '#e5e7eb';
  if (index < currentStepIndex.value) return '#10b981';
  return '#e5e7eb';
};
</script>

<template>
  <div class="status-bar">
    <!-- Cancelled badge -->
    <div v-if="isCancelled" class="cancelled-badge">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="cancelled-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      Annulée
    </div>

    <!-- Steps -->
    <div class="steps-container">
      <template v-for="(step, index) in steps" :key="step">
        <!-- Line between steps -->
        <div
          v-if="index > 0"
          class="step-line"
          :style="{ backgroundColor: getLineColor(index - 1) }"
        />

        <!-- Step circle -->
        <div class="step-wrapper">
          <div
            class="step-circle"
            :class="{
              'step-circle--active': getStepState(index) === 'active',
            }"
            :style="{
              backgroundColor: getStepState(index) === 'active' || getStepState(index) === 'completed'
                ? getStepColor(index)
                : 'transparent',
              borderColor: getStepColor(index),
            }"
          >
            <!-- Checkmark for completed -->
            <svg
              v-if="getStepState(index) === 'completed'"
              xmlns="http://www.w3.org/2000/svg"
              class="step-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <!-- Dot for active -->
            <div
              v-else-if="getStepState(index) === 'active'"
              class="step-dot"
            />
          </div>
          <span
            class="step-label"
            :class="{
              'step-label--active': getStepState(index) === 'active',
              'step-label--completed': getStepState(index) === 'completed',
              'step-label--cancelled': getStepState(index) === 'cancelled',
            }"
          >
            {{ STATUS_CONFIG[step].label }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cancelled-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 8px;
  background-color: #fef2f2;
  color: #ef4444;
  font-size: 14px;
  font-weight: 600;
}

.cancelled-icon {
  width: 16px;
  height: 16px;
}

.steps-container {
  display: flex;
  align-items: flex-start;
}

.step-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.step-circle--active {
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06);
}

.step-icon {
  width: 16px;
  height: 16px;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: white;
}

.step-line {
  height: 2.5px;
  flex: 1;
  min-width: 12px;
  margin-top: 15px; /* center with circle (32px / 2 - 1px) */
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.step-label {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  text-align: center;
  max-width: 72px;
  line-height: 1.3;
  white-space: nowrap;
}

.step-label--active {
  color: #222222;
  font-weight: 600;
}

.step-label--completed {
  color: #059669;
  font-weight: 500;
}

.step-label--cancelled {
  color: #d1d5db;
}

/* Mobile: hide labels, show on active only */
@media (max-width: 480px) {
  .step-label {
    display: none;
  }

  .step-label--active {
    display: block;
    font-size: 12px;
  }

  .step-circle {
    width: 28px;
    height: 28px;
  }

  .step-line {
    margin-top: 13px;
    min-width: 8px;
  }
}
</style>
