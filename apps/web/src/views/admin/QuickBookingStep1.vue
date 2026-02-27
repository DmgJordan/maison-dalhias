<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuickBookingFormStore, SOURCE_LABELS } from '../../stores/quickBookingForm';
import StepIndicator from '../../components/admin/StepIndicator.vue';
import DatePicker from '../../components/admin/DatePicker.vue';
import { bookingsApi, type BookingSource, type ConflictDetail } from '../../lib/api';
import { formatDateShort } from '../../utils/formatting';

const router = useRouter();
const store = useQuickBookingFormStore();

const isCheckingConflict = ref(false);
const hasConflict = ref(false);
const conflictDetail = ref<ConflictDetail | null>(null);

const sourceOptions: { value: BookingSource; label: string }[] = [
  { value: 'ABRITEL', label: 'Abritel' },
  { value: 'AIRBNB', label: 'Airbnb' },
  { value: 'BOOKING_COM', label: 'Booking.com' },
  { value: 'PERSONNEL', label: 'Personnel' },
  { value: 'FAMILLE', label: 'Famille' },
  { value: 'OTHER', label: 'Autre' },
];

function buildConflictMessage(detail: ConflictDetail): string {
  const sourceLabel = detail.source ? (SOURCE_LABELS[detail.source] ?? detail.source) : '';
  const identifier = detail.label ?? detail.clientName ?? '';
  const dates = `${formatDateShort(detail.startDate)} - ${formatDateShort(detail.endDate)}`;

  let message = 'Ces dates chevauchent une réservation existante';
  const parts: string[] = [];
  if (sourceLabel) parts.push(sourceLabel);
  if (identifier) parts.push(identifier);

  if (parts.length > 0) {
    message += ` (${parts.join(' — ')}, ${dates})`;
  } else {
    message += ` (${dates})`;
  }

  return message;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch([() => store.startDate, () => store.endDate], () => {
  if (debounceTimer) clearTimeout(debounceTimer);

  isCheckingConflict.value = false;
  hasConflict.value = false;
  conflictDetail.value = null;

  if (!store.startDate || !store.endDate) return;

  const start = new Date(store.startDate);
  const end = new Date(store.endDate);
  if (end <= start) return;

  isCheckingConflict.value = true;

  debounceTimer = setTimeout(async () => {
    try {
      const result = await bookingsApi.checkConflicts(store.startDate, store.endDate);
      hasConflict.value = result.hasConflict;
      conflictDetail.value = result.conflictDetail ?? null;
    } catch {
      hasConflict.value = false;
      conflictDetail.value = null;
    } finally {
      isCheckingConflict.value = false;
    }
  }, 300);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

const canProceed = computed((): boolean => {
  return store.isStep1Valid && !hasConflict.value && !isCheckingConflict.value;
});

function goNext(): void {
  if (!canProceed.value) return;
  router.push({ name: 'AdminQuickBookingStep2' });
}
</script>

<template>
  <div class="quick-step-view">
    <StepIndicator :steps="[{ label: 'Dates & source' }, { label: 'Détails' }]" :current-step="1" />

    <div class="step-content">
      <!-- Date pickers -->
      <div class="form-group">
        <DatePicker
          v-model="store.startDate"
          label="Date d'arrivée"
          placeholder="Choisir la date d'arrivée"
        />
      </div>

      <div class="form-group">
        <DatePicker
          v-model="store.endDate"
          label="Date de départ"
          placeholder="Choisir la date de départ"
          :min-date="store.startDate"
          :disabled="!store.startDate"
        />
      </div>

      <!-- Nights count -->
      <p v-if="store.nightsCount > 0" class="nights-count">
        {{ store.nightsCount }} nuit{{ store.nightsCount > 1 ? 's' : '' }}
      </p>

      <!-- Checking indicator -->
      <p v-if="isCheckingConflict" class="checking-indicator">Vérification...</p>

      <!-- Conflict error -->
      <p v-if="hasConflict && conflictDetail && !isCheckingConflict" class="form-field-error">
        {{ buildConflictMessage(conflictDetail) }}
      </p>

      <!-- Source dropdown -->
      <div class="form-group form-group--spaced">
        <label for="source" class="form-label">Source</label>
        <select id="source" v-model="store.source" class="form-input">
          <option value="" disabled>Choisir une source</option>
          <option v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Custom source name -->
      <div v-if="store.source === 'OTHER'" class="form-group">
        <label for="sourceCustomName" class="form-label">Nom de la source</label>
        <input
          id="sourceCustomName"
          v-model="store.sourceCustomName"
          type="text"
          placeholder="Ex : Leboncoin, Amis..."
          class="form-input"
        />
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-navigation">
      <router-link :to="{ name: 'AdminNewBooking' }" class="nav-btn nav-btn--prev">
        ← Retour
      </router-link>

      <button type="button" class="nav-btn nav-btn--next" :disabled="!canProceed" @click="goNext">
        Suivant →
      </button>
    </div>
  </div>
</template>

<style scoped>
.quick-step-view {
  max-width: 500px;
  margin: 0 auto;
  padding: 0 16px 40px;
}

.step-content {
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group--spaced {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e5e5;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #484848;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-size: 16px;
  color: #222222;
  transition: all 0.2s;
  background-color: white;
  min-height: 48px;
}

.form-input:focus {
  outline: none;
  border-color: #ff385c;
}

.nights-count {
  font-size: 14px;
  color: #484848;
  margin: -12px 0 0 0;
}

.checking-indicator {
  font-size: 14px;
  color: #a3a3a3;
  margin: 0;
}

.form-field-error {
  font-size: 14px;
  color: #dc2626;
  margin-top: 6px;
  margin-bottom: 0;
}

/* Navigation */
.step-navigation {
  display: flex;
  gap: 12px;
}

.nav-btn {
  flex: 1;
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
  text-decoration: none;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn--prev {
  background-color: #f3f4f6;
  color: #484848;
}

.nav-btn--prev:hover {
  background-color: #e5e5e5;
}

.nav-btn--next {
  background-color: #ff385c;
  color: white;
}

.nav-btn--next:hover:not(:disabled) {
  background-color: #e31c5f;
}

@media (min-width: 768px) {
  .quick-step-view {
    max-width: 600px;
  }
}

@media (min-width: 1024px) {
  .quick-step-view {
    max-width: 700px;
  }

  .step-content {
    padding: 32px;
  }
}
</style>
