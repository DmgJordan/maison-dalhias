<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Season } from '../../lib/api';
import BaseModal from './BaseModal.vue';

interface SaveData {
  name: string;
  pricePerNight: number;
  weeklyNightRate?: number | null;
  minNights: number;
}

interface Props {
  season?: Season | null;
  submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  season: null,
  submitting: false,
});

const emit = defineEmits<{
  close: [];
  save: [data: SaveData];
}>();

const name = ref('');
const pricePerNight = ref<number | string>('');
const weeklyNightRate = ref<number | string>('');
const minNights = ref<number>(3);

const minNightsOptions = [
  { value: 1, label: '1 nuit' },
  { value: 2, label: '2 nuits' },
  { value: 3, label: '3 nuits' },
  { value: 7, label: '7 nuits (semaine)' },
  { value: 14, label: '14 nuits (2 semaines)' },
];

const isEditing = computed((): boolean => !!props.season);

const modalTitle = computed((): string => {
  return isEditing.value ? 'Modifier la saison' : 'Nouvelle saison';
});

const weeklyPriceDisplay = computed((): string | null => {
  const rate =
    typeof weeklyNightRate.value === 'string'
      ? parseFloat(weeklyNightRate.value)
      : weeklyNightRate.value;
  if (isNaN(rate) || rate <= 0) return null;
  return `${(rate * 7).toFixed(0)}`;
});

const weeklyRateError = computed((): string | null => {
  const numPrice =
    typeof pricePerNight.value === 'string' ? parseFloat(pricePerNight.value) : pricePerNight.value;
  const weeklyRate =
    typeof weeklyNightRate.value === 'string'
      ? parseFloat(weeklyNightRate.value)
      : weeklyNightRate.value;

  if (!isNaN(weeklyRate) && weeklyRate > 0 && !isNaN(numPrice) && weeklyRate > numPrice) {
    return 'Le tarif hebdo doit être inférieur ou égal au tarif standard';
  }
  return null;
});

const isValid = computed((): boolean => {
  const trimmedName = name.value.trim();
  const numPrice =
    typeof pricePerNight.value === 'string' ? parseFloat(pricePerNight.value) : pricePerNight.value;

  if (weeklyRateError.value) return false;

  return trimmedName.length > 0 && !isNaN(numPrice) && numPrice > 0;
});

const handleSubmit = (): void => {
  if (!isValid.value || props.submitting) return;

  const numPrice =
    typeof pricePerNight.value === 'string' ? parseFloat(pricePerNight.value) : pricePerNight.value;
  const numWeeklyRate =
    typeof weeklyNightRate.value === 'string'
      ? parseFloat(weeklyNightRate.value)
      : weeklyNightRate.value;

  const data: SaveData = {
    name: name.value.trim(),
    pricePerNight: numPrice,
    minNights: minNights.value,
  };

  // Inclure weeklyNightRate seulement si défini
  if (!isNaN(numWeeklyRate) && numWeeklyRate > 0) {
    data.weeklyNightRate = numWeeklyRate;
  } else if (props.season?.weeklyNightRate !== null) {
    // Si on édite et qu'on vide le champ, envoyer null
    data.weeklyNightRate = null;
  }

  emit('save', data);
};

const handleClose = (): void => {
  if (!props.submitting) {
    emit('close');
  }
};

// Synchroniser les refs quand la prop season change
watch(
  () => props.season,
  (newSeason) => {
    if (newSeason) {
      name.value = newSeason.name;
      pricePerNight.value = newSeason.pricePerNight;
      weeklyNightRate.value = newSeason.weeklyNightRate ?? '';
      minNights.value = newSeason.minNights;
    } else {
      name.value = '';
      pricePerNight.value = '';
      weeklyNightRate.value = '';
      minNights.value = 3;
    }
  },
  { immediate: true }
);
</script>

<template>
  <BaseModal :title="modalTitle" :submitting="submitting" max-width="420px" @close="handleClose">
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="season-name" class="form-label">Nom de la saison</label>
        <input
          id="season-name"
          v-model="name"
          type="text"
          class="form-input"
          placeholder="Ex: Haute saison"
          :disabled="submitting"
          autofocus
        />
      </div>

      <div class="form-group">
        <label for="season-price" class="form-label">Prix par nuit</label>
        <div class="price-input">
          <input
            id="season-price"
            v-model="pricePerNight"
            type="number"
            class="form-input"
            placeholder="0"
            min="1"
            step="1"
            :disabled="submitting"
          />
          <span class="price-suffix">EUR / nuit</span>
        </div>
      </div>

      <div class="form-group">
        <label for="weekly-rate" class="form-label">
          Prix par nuit (7+ nuits)
          <span class="label-hint">Optionnel</span>
        </label>
        <div class="price-input">
          <input
            id="weekly-rate"
            v-model="weeklyNightRate"
            type="number"
            class="form-input"
            :class="{ 'has-error': weeklyRateError }"
            placeholder="Laisser vide si pas de réduction"
            min="1"
            step="1"
            :disabled="submitting"
          />
          <span class="price-suffix">EUR / nuit</span>
        </div>
        <p v-if="weeklyRateError" class="field-error">{{ weeklyRateError }}</p>
        <p v-else-if="weeklyPriceDisplay" class="field-hint">
          Soit {{ weeklyPriceDisplay }} EUR par semaine
        </p>
      </div>

      <div class="form-group">
        <label for="min-nights" class="form-label">Minimum de nuits</label>
        <select id="min-nights" v-model="minNights" class="form-input" :disabled="submitting">
          <option v-for="option in minNightsOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </form>

    <template #actions>
      <button type="button" class="btn btn-secondary" :disabled="submitting" @click="handleClose">
        Annuler
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="!isValid || submitting"
        @click="handleSubmit"
      >
        <span v-if="submitting" class="spinner"></span>
        {{ isEditing ? 'Enregistrer' : 'Créer' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
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

.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  color: #111827;
  transition: all 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.1);
}

.form-input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-input.has-error {
  border-color: #ef4444;
}

.form-input.has-error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

select.form-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 40px;
}

.label-hint {
  font-weight: 400;
  color: #9ca3af;
  font-size: 13px;
  margin-left: 8px;
}

.field-hint {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

.field-error {
  margin-top: 6px;
  font-size: 13px;
  color: #ef4444;
}

.price-input {
  position: relative;
}

.price-input .form-input {
  padding-right: 90px;
}

.price-suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #6b7280;
  pointer-events: none;
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
</style>
