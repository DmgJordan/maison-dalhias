<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { DatePeriod, Season } from '../../lib/api';
import { formatPrice, formatDateForInput, countDays } from '../../utils/formatting';
import BaseModal from './BaseModal.vue';
import DatePicker from './DatePicker.vue';

interface Props {
  period?: DatePeriod | null;
  seasons: Season[];
  year: number;
  submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  period: null,
  submitting: false,
});

const emit = defineEmits<{
  close: [];
  save: [data: { startDate: string; endDate: string; year: number; seasonId: string }];
}>();

// Form state
const startDate = ref('');
const endDate = ref('');
const seasonId = ref('');

const isEditing = computed((): boolean => !!props.period);

const modalTitle = computed((): string => {
  return isEditing.value ? 'Modifier la plage' : 'Nouvelle plage de dates';
});

const selectedSeason = computed((): Season | undefined => {
  return props.seasons.find((s) => s.id === seasonId.value);
});

const isValid = computed((): boolean => {
  if (!startDate.value || !endDate.value || !seasonId.value) return false;

  const start = new Date(startDate.value);
  const end = new Date(endDate.value);

  return start < end;
});

const daysCount = computed((): number => {
  if (!startDate.value || !endDate.value) return 0;
  return countDays(startDate.value, endDate.value);
});

const estimatedTotal = computed((): number => {
  if (!selectedSeason.value || daysCount.value <= 0) return 0;
  return daysCount.value * selectedSeason.value.pricePerNight;
});

const handleSubmit = (): void => {
  if (!isValid.value || props.submitting) return;

  emit('save', {
    startDate: startDate.value,
    endDate: endDate.value,
    year: props.year,
    seasonId: seasonId.value,
  });
};

const handleClose = (): void => {
  if (!props.submitting) {
    emit('close');
  }
};

// Synchroniser les refs quand la prop period change
watch(
  () => props.period,
  (newPeriod) => {
    if (newPeriod) {
      startDate.value = formatDateForInput(newPeriod.startDate);
      endDate.value = formatDateForInput(newPeriod.endDate);
      seasonId.value = newPeriod.season.id;
    } else {
      startDate.value = '';
      endDate.value = '';
      // Default: set season to first available if exists
      if (props.seasons.length > 0) {
        seasonId.value = props.seasons[0].id;
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <BaseModal :title="modalTitle" :submitting="submitting" max-width="480px" @close="handleClose">
    <form @submit.prevent="handleSubmit">
      <!-- Année (readonly) -->
      <div class="year-badge">Année {{ year }}</div>

      <!-- Dates -->
      <div class="dates-column">
        <div class="form-group">
          <DatePicker
            v-model="startDate"
            label="Date de début"
            placeholder="Choisir la date de début"
            :disabled="submitting"
          />
        </div>
        <div class="form-group">
          <DatePicker
            v-model="endDate"
            label="Date de fin"
            placeholder="Choisir la date de fin"
            :min-date="startDate"
            :disabled="submitting || !startDate"
          />
        </div>
      </div>

      <!-- Durée -->
      <div v-if="daysCount > 0" class="duration-info">
        {{ daysCount }} jour{{ daysCount > 1 ? 's' : '' }}
      </div>

      <!-- Saison -->
      <div class="form-group">
        <label for="season-select" class="form-label">Saison</label>
        <div v-if="seasons.length === 0" class="no-seasons-warning">
          Aucune saison disponible. Créez d'abord une saison.
        </div>
        <select
          v-else
          id="season-select"
          v-model="seasonId"
          class="form-select"
          :disabled="submitting"
          required
        >
          <option value="" disabled>Sélectionnez une saison</option>
          <option v-for="season in seasons" :key="season.id" :value="season.id">
            {{ season.name }} - {{ formatPrice(season.pricePerNight) }}/nuit
          </option>
        </select>
      </div>

      <!-- Preview -->
      <div v-if="selectedSeason && daysCount > 0" class="preview-section">
        <div class="preview-card">
          <div class="preview-row">
            <span class="preview-season">{{ selectedSeason.name }}</span>
            <span class="preview-price">{{ formatPrice(selectedSeason.pricePerNight) }}/nuit</span>
          </div>
          <div class="preview-total">
            {{ daysCount }} jour{{ daysCount > 1 ? 's' : '' }} =
            <strong>{{ formatPrice(estimatedTotal) }}</strong>
          </div>
        </div>
      </div>
    </form>

    <template #actions>
      <button type="button" class="btn btn-secondary" :disabled="submitting" @click="handleClose">
        Annuler
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="!isValid || submitting || seasons.length === 0"
        @click="handleSubmit"
      >
        <span v-if="submitting" class="spinner"></span>
        {{ isEditing ? 'Enregistrer' : 'Créer' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.year-badge {
  display: inline-block;
  padding: 8px 14px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 20px;
}

.dates-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  color: #111827;
  background-color: white;
  transition: all 0.15s;
}

.form-select:focus {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.1);
}

.form-select:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 18px;
  padding-right: 40px;
}

.duration-info {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 20px;
  text-align: center;
}

.no-seasons-warning {
  padding: 12px 14px;
  background-color: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

/* Preview */
.preview-section {
  margin-top: 20px;
}

.preview-card {
  padding: 14px 16px;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.preview-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.preview-season {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.preview-price {
  font-size: 13px;
  color: #6b7280;
}

.preview-total {
  font-size: 15px;
  color: #374151;
}

.preview-total strong {
  color: #111827;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.btn-primary {
  background: #ff385c;
  color: white;
  min-width: 100px;
}

.btn-primary:hover:not(:disabled) {
  background: #e31c5f;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Mobile */
@media (max-width: 480px) {
  .btn {
    width: 100%;
  }
}
</style>
