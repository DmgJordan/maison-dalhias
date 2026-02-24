<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import BaseModal from './BaseModal.vue';
import {
  bookingsApi,
  type Booking,
  type BookingSource,
  type PaymentStatus,
  type UpdateQuickBookingData,
  type ConflictDetail,
} from '../../lib/api';
import { SOURCE_LABELS, PAYMENT_STATUS_LABELS } from '../../constants/booking';
import { formatDateForInput, formatDateShort } from '../../utils/formatting';

interface Props {
  booking: Booking;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  updated: [booking: Booking];
}>();

// Normalize Decimal/string amounts to number | null
const parseAmount = (val: unknown): number | null => {
  if (val == null) return null;
  const num = typeof val === 'string' ? parseFloat(val) : (val as number);
  return isNaN(num) ? null : num;
};

const originalAmount = parseAmount(props.booking.externalAmount);

// Form state (local refs)
const startDate = ref(formatDateForInput(props.booking.startDate));
const endDate = ref(formatDateForInput(props.booking.endDate));
const source = ref<BookingSource>(props.booking.source ?? 'ABRITEL');
const sourceCustomName = ref(props.booking.sourceCustomName ?? '');
const label = ref(props.booking.label ?? '');
const externalAmount = ref<number | null>(originalAmount);
const occupantsCount = ref<number | null>(props.booking.occupantsCount ?? null);
const adultsCount = ref(props.booking.adultsCount ?? 1);
const notes = ref(props.booking.notes ?? '');
const paymentStatus = ref<PaymentStatus | ''>(props.booking.paymentStatus ?? '');

// UI state
const isSubmitting = ref(false);
const conflictError = ref<string | null>(null);
const isCheckingConflicts = ref(false);
const dateError = ref<string | null>(null);
const saveError = ref<string | null>(null);

const sourceOptions: { value: BookingSource; label: string }[] = [
  { value: 'ABRITEL', label: SOURCE_LABELS.ABRITEL },
  { value: 'AIRBNB', label: SOURCE_LABELS.AIRBNB },
  { value: 'BOOKING_COM', label: SOURCE_LABELS.BOOKING_COM },
  { value: 'PERSONNEL', label: SOURCE_LABELS.PERSONNEL },
  { value: 'FAMILLE', label: SOURCE_LABELS.FAMILLE },
  { value: 'OTHER', label: SOURCE_LABELS.OTHER },
];

const paymentStatusOptions: { value: PaymentStatus | ''; label: string }[] = [
  { value: '', label: 'Non defini' },
  { value: 'PENDING', label: PAYMENT_STATUS_LABELS.PENDING },
  { value: 'PARTIAL', label: PAYMENT_STATUS_LABELS.PARTIAL },
  { value: 'PAID', label: PAYMENT_STATUS_LABELS.PAID },
  { value: 'FREE', label: PAYMENT_STATUS_LABELS.FREE },
];

const showSourceCustomName = computed((): boolean => source.value === 'OTHER');

function buildConflictMessage(detail: ConflictDetail): string {
  const sourceLabel = detail.source ? (SOURCE_LABELS[detail.source] ?? detail.source) : '';
  const identifier = detail.label ?? detail.clientName ?? '';
  const dates = `${formatDateShort(detail.startDate)} - ${formatDateShort(detail.endDate)}`;

  let message = 'Ces dates chevauchent une reservation existante';
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

// Normalize number fields when user clears input (v-model.number returns '' or NaN)
watch(externalAmount, (val) => {
  if (val !== null && (typeof val !== 'number' || isNaN(val))) externalAmount.value = null;
});
watch(occupantsCount, (val) => {
  if (val !== null && (typeof val !== 'number' || isNaN(val))) occupantsCount.value = null;
});

// Debounced conflict checking
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch([startDate, endDate], () => {
  if (debounceTimer) clearTimeout(debounceTimer);

  conflictError.value = null;
  isCheckingConflicts.value = false;
  dateError.value = null;

  if (!startDate.value || !endDate.value) return;

  if (new Date(endDate.value) <= new Date(startDate.value)) {
    dateError.value = 'La date de fin doit etre posterieure a la date de debut';
    return;
  }

  // Skip conflict check if dates haven't changed
  if (
    startDate.value === formatDateForInput(props.booking.startDate) &&
    endDate.value === formatDateForInput(props.booking.endDate)
  ) {
    return;
  }

  isCheckingConflicts.value = true;

  debounceTimer = setTimeout(async () => {
    try {
      const result = await bookingsApi.checkConflicts(
        startDate.value,
        endDate.value,
        props.booking.id
      );
      if (result.hasConflict) {
        conflictError.value = result.conflictDetail
          ? buildConflictMessage(result.conflictDetail)
          : 'Ces dates chevauchent une reservation existante';
      } else {
        conflictError.value = null;
      }
    } catch {
      // Silently handle — conflict will be caught on save
    } finally {
      isCheckingConflicts.value = false;
    }
  }, 300);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

const hasChanges = computed((): boolean => {
  return (
    startDate.value !== formatDateForInput(props.booking.startDate) ||
    endDate.value !== formatDateForInput(props.booking.endDate) ||
    source.value !== props.booking.source ||
    sourceCustomName.value !== (props.booking.sourceCustomName ?? '') ||
    label.value !== (props.booking.label ?? '') ||
    externalAmount.value !== originalAmount ||
    occupantsCount.value !== (props.booking.occupantsCount ?? null) ||
    adultsCount.value !== (props.booking.adultsCount ?? 1) ||
    notes.value !== (props.booking.notes ?? '') ||
    paymentStatus.value !== (props.booking.paymentStatus ?? '')
  );
});

const canSave = computed((): boolean => {
  return (
    hasChanges.value &&
    !isSubmitting.value &&
    !conflictError.value &&
    !dateError.value &&
    !isCheckingConflicts.value &&
    !!startDate.value &&
    !!endDate.value &&
    (source.value !== 'OTHER' || sourceCustomName.value.trim() !== '')
  );
});

async function handleSave(): Promise<void> {
  if (!canSave.value) return;

  isSubmitting.value = true;
  saveError.value = null;

  try {
    const data: UpdateQuickBookingData = {};

    // Only include changed fields
    if (startDate.value !== formatDateForInput(props.booking.startDate))
      data.startDate = startDate.value;
    if (endDate.value !== formatDateForInput(props.booking.endDate)) data.endDate = endDate.value;
    if (source.value !== props.booking.source) data.source = source.value;
    if (sourceCustomName.value !== (props.booking.sourceCustomName ?? ''))
      data.sourceCustomName = source.value === 'OTHER' ? sourceCustomName.value : undefined;
    if (label.value !== (props.booking.label ?? '')) data.label = label.value;

    if (externalAmount.value !== originalAmount)
      data.externalAmount = externalAmount.value ?? undefined;
    if (occupantsCount.value !== (props.booking.occupantsCount ?? null))
      data.occupantsCount = occupantsCount.value ?? undefined;
    if (adultsCount.value !== (props.booking.adultsCount ?? 1))
      data.adultsCount = adultsCount.value;
    if (notes.value !== (props.booking.notes ?? '')) data.notes = notes.value;
    if (paymentStatus.value !== (props.booking.paymentStatus ?? ''))
      data.paymentStatus = paymentStatus.value || undefined;

    const updated = await bookingsApi.updateQuick(props.booking.id, data);
    emit('updated', updated);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: { message?: string; conflictingBooking?: ConflictDetail };
        };
      };
      if (axiosErr.response?.status === 409) {
        const conflict = axiosErr.response.data?.conflictingBooking;
        conflictError.value = conflict
          ? buildConflictMessage(conflict)
          : (axiosErr.response.data?.message ?? 'Conflit de dates detecte');
      } else {
        saveError.value =
          axiosErr.response?.data?.message ?? 'Une erreur est survenue lors de la sauvegarde';
      }
    } else {
      saveError.value = 'Erreur de connexion. Veuillez reessayer.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <BaseModal title="Modifier la reservation rapide" :submitting="isSubmitting" max-width="500px">
    <form class="quick-edit-form" @submit.prevent="handleSave">
      <!-- Dates -->
      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="qe-start-date">Date d'arrivee</label>
          <input
            id="qe-start-date"
            v-model="startDate"
            type="date"
            class="form-input"
            :class="{ 'form-input--error': dateError || conflictError }"
          />
        </div>
        <div class="form-field">
          <label class="form-label" for="qe-end-date">Date de depart</label>
          <input
            id="qe-end-date"
            v-model="endDate"
            type="date"
            class="form-input"
            :class="{ 'form-input--error': dateError || conflictError }"
          />
        </div>
      </div>
      <p v-if="dateError" class="form-error">{{ dateError }}</p>
      <p v-if="conflictError" class="form-error">{{ conflictError }}</p>
      <p v-if="isCheckingConflicts" class="form-hint">Verification des disponibilites...</p>

      <!-- Source -->
      <div class="form-field">
        <label class="form-label" for="qe-source">Source</label>
        <select id="qe-source" v-model="source" class="form-input form-select">
          <option v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Source custom name -->
      <div v-if="showSourceCustomName" class="form-field">
        <label class="form-label" for="qe-source-custom">Nom de la source</label>
        <input
          id="qe-source-custom"
          v-model="sourceCustomName"
          type="text"
          class="form-input"
          placeholder="Ex: Leboncoin, Amis..."
          :class="{ 'form-input--error': source === 'OTHER' && !sourceCustomName.trim() }"
        />
        <p v-if="source === 'OTHER' && !sourceCustomName.trim()" class="form-error">
          Le nom de la source est requis
        </p>
      </div>

      <!-- Label -->
      <div class="form-field">
        <label class="form-label" for="qe-label">
          Libelle <span class="form-optional">— Facultatif</span>
        </label>
        <input
          id="qe-label"
          v-model="label"
          type="text"
          class="form-input"
          placeholder="Ex: Famille Martin"
        />
      </div>

      <!-- External amount -->
      <div class="form-field">
        <label class="form-label" for="qe-amount">
          Montant recu <span class="form-optional">— Facultatif</span>
        </label>
        <div class="input-with-suffix">
          <input
            id="qe-amount"
            v-model.number="externalAmount"
            type="number"
            class="form-input"
            placeholder="0"
            min="0"
            step="0.01"
          />
          <span class="input-suffix">€</span>
        </div>
      </div>

      <!-- Occupants / Adults -->
      <div class="form-row">
        <div class="form-field">
          <label class="form-label" for="qe-occupants">
            Occupants <span class="form-optional">— Facultatif</span>
          </label>
          <input
            id="qe-occupants"
            v-model.number="occupantsCount"
            type="number"
            class="form-input"
            min="1"
            max="6"
            placeholder="-"
          />
        </div>
        <div class="form-field">
          <label class="form-label" for="qe-adults">
            Adultes <span class="form-optional">— Facultatif</span>
          </label>
          <input
            id="qe-adults"
            v-model.number="adultsCount"
            type="number"
            class="form-input"
            min="1"
            max="6"
          />
        </div>
      </div>

      <!-- Payment status -->
      <div class="form-field">
        <label class="form-label" for="qe-payment">
          Statut de paiement <span class="form-optional">— Facultatif</span>
        </label>
        <select id="qe-payment" v-model="paymentStatus" class="form-input form-select">
          <option v-for="opt in paymentStatusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Notes -->
      <div class="form-field">
        <label class="form-label" for="qe-notes">
          Notes <span class="form-optional">— Facultatif</span>
        </label>
        <textarea
          id="qe-notes"
          v-model="notes"
          class="form-textarea"
          rows="3"
          placeholder="Notes internes..."
        ></textarea>
      </div>

      <!-- Save error -->
      <div v-if="saveError" class="save-error">
        {{ saveError }}
      </div>
    </form>

    <template #actions>
      <button class="btn-cancel" type="button" :disabled="isSubmitting" @click="emit('close')">
        Annuler
      </button>
      <button class="btn-save" type="button" :disabled="!canSave" @click="handleSave">
        <svg
          v-if="isSubmitting"
          class="btn-spinner"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.3" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
          />
        </svg>
        {{ isSubmitting ? 'En cours...' : 'Enregistrer' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.quick-edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 15px;
  font-weight: 500;
  color: #222222;
}

.form-optional {
  font-weight: 400;
  color: #717171;
  font-size: 13px;
}

.form-input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  color: #222222;
  background-color: white;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 2px rgba(255, 56, 92, 0.1);
}

.form-input--error {
  border-color: #ef4444;
}

.form-input--error:focus {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23717171' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
}

.form-textarea {
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  color: #222222;
  background-color: white;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 48px;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 2px rgba(255, 56, 92, 0.1);
}

.form-error {
  margin: 0;
  font-size: 13px;
  color: #ef4444;
  line-height: 1.4;
}

.form-hint {
  margin: 0;
  font-size: 13px;
  color: #717171;
  font-style: italic;
}

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-suffix .form-input {
  padding-right: 40px;
}

.input-suffix {
  position: absolute;
  right: 14px;
  font-size: 15px;
  color: #717171;
  pointer-events: none;
}

.save-error {
  padding: 12px 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 14px;
  color: #dc2626;
}

.btn-cancel {
  height: 44px;
  padding: 0 20px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background-color: white;
  color: #484848;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #f7f7f7;
  border-color: #d4d4d4;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-save {
  height: 48px;
  padding: 0 32px;
  border: none;
  border-radius: 12px;
  background-color: #ff385c;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-save:hover:not(:disabled) {
  background-color: #e0314f;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Mobile */
@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
