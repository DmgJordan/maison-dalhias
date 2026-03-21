<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import BaseModal from './BaseModal.vue';
import DatePicker from './DatePicker.vue';
import {
  bookingsApi,
  type Booking,
  type BookingSource,
  type UpdateQuickBookingData,
  type ConflictDetail,
} from '../../lib/api';
import { SOURCE_LABELS } from '../../constants/booking';
import { formatDateForInput, formatDateShort, formatPrice } from '../../utils/formatting';

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

// Section editing state
const editingSection = ref<string | null>(null);
const sectionBackup = ref<Record<string, unknown> | null>(null);

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

// Booked dates for calendar
const bookedCheckinDates = ref<string[]>([]);
const bookedCheckoutDates = ref<string[]>([]);

const fetchBookedDates = async (): Promise<void> => {
  try {
    const result = await bookingsApi.getBookedDates();
    // Exclure les dates de la réservation en cours
    const bookingStart = new Date(props.booking.startDate);
    const bookingEnd = new Date(props.booking.endDate);
    const currentDates = new Set<string>();
    const current = new Date(bookingStart);
    while (current <= bookingEnd) {
      currentDates.add(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    bookedCheckinDates.value = result.checkinDisabled.filter((d) => !currentDates.has(d));
    bookedCheckoutDates.value = result.checkoutDisabled.filter((d) => !currentDates.has(d));
  } catch {
    // Continuer sans les dates réservées
  }
};

onMounted(() => {
  void fetchBookedDates();
});

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

const showSourceCustomName = computed((): boolean => source.value === 'OTHER');

const nightsCount = computed((): number => {
  if (!startDate.value || !endDate.value) return 0;
  const s = new Date(startDate.value);
  const e = new Date(endDate.value);
  const diff = Math.abs(e.getTime() - s.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const sourceDisplayName = computed((): string => {
  if (source.value === 'OTHER' && sourceCustomName.value.trim()) {
    return sourceCustomName.value.trim();
  }
  return SOURCE_LABELS[source.value] ?? String(source.value);
});

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

// Section editing
const startEditing = (section: string): void => {
  if (section === 'dates') {
    sectionBackup.value = { startDate: startDate.value, endDate: endDate.value };
  } else if (section === 'source') {
    sectionBackup.value = {
      source: source.value,
      sourceCustomName: sourceCustomName.value,
      label: label.value,
    };
  } else if (section === 'details') {
    sectionBackup.value = {
      externalAmount: externalAmount.value,
      occupantsCount: occupantsCount.value,
      adultsCount: adultsCount.value,
    };
  } else if (section === 'notes') {
    sectionBackup.value = { notes: notes.value };
  }
  editingSection.value = section;
};

const cancelEditing = (): void => {
  if (editingSection.value && sectionBackup.value) {
    const backup = sectionBackup.value;
    if (editingSection.value === 'dates') {
      startDate.value = backup.startDate as string;
      endDate.value = backup.endDate as string;
    } else if (editingSection.value === 'source') {
      source.value = backup.source as BookingSource;
      sourceCustomName.value = backup.sourceCustomName as string;
      label.value = backup.label as string;
    } else if (editingSection.value === 'details') {
      externalAmount.value = backup.externalAmount as number | null;
      occupantsCount.value = backup.occupantsCount as number | null;
      adultsCount.value = backup.adultsCount as number;
    } else if (editingSection.value === 'notes') {
      notes.value = backup.notes as string;
    }
  }
  editingSection.value = null;
};

const confirmSection = (): void => {
  editingSection.value = null;
};

// Normalize number fields when user clears input
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
    dateError.value = 'La date de fin doit être postérieure à la date de début';
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
          : 'Ces dates chevauchent une réservation existante';
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
    notes.value !== (props.booking.notes ?? '')
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

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
          : (axiosErr.response.data?.message ?? 'Conflit de dates détecté');
      } else {
        saveError.value =
          axiosErr.response?.data?.message ?? 'Une erreur est survenue lors de la sauvegarde';
      }
    } else {
      saveError.value = 'Erreur de connexion. Veuillez réessayer.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <BaseModal title="Modifier la réservation" :submitting="isSubmitting" max-width="560px" @close="emit('close')">
    <!-- Erreur globale -->
    <div v-if="saveError" class="edit-error">
      <span>{{ saveError }}</span>
      <button class="edit-error-close" @click="saveError = null">Fermer</button>
    </div>

    <!-- Section Dates -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'dates' }">
      <div class="edit-section-header">
        <div class="edit-section-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="edit-section-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>DATES</span>
        </div>
        <button v-if="editingSection !== 'dates'" class="edit-btn" @click="startEditing('dates')">
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'dates'" class="edit-section-summary">
        <span>Du {{ formatDate(startDate) }} au {{ formatDate(endDate) }}</span>
        <span class="edit-section-detail">{{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}</span>
      </div>
      <div v-else class="edit-section-form">
        <div class="date-fields">
          <DatePicker v-model="startDate" label="Date d'arrivée" placeholder="Choisir la date d'arrivée" :disabled-dates="bookedCheckinDates" />
          <DatePicker
            v-model="endDate"
            label="Date de départ"
            placeholder="Choisir la date de départ"
            :min-date="startDate"
            :disabled="!startDate"
            :disabled-dates="bookedCheckoutDates"
          />
        </div>
        <p v-if="nightsCount > 0" class="date-nights-info">
          {{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}
        </p>
        <p v-if="dateError" class="form-field-error">{{ dateError }}</p>
        <p v-if="conflictError" class="form-field-error">{{ conflictError }}</p>
        <p v-if="isCheckingConflicts" class="form-hint">Vérification des disponibilités...</p>
      </div>
    </div>

    <!-- Section Source & Libellé -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'source' }">
      <div class="edit-section-header">
        <div class="edit-section-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="edit-section-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>SOURCE</span>
        </div>
        <button v-if="editingSection !== 'source'" class="edit-btn" @click="startEditing('source')">
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'source'" class="edit-section-summary">
        <span class="summary-name">{{ sourceDisplayName }}</span>
        <span v-if="label" class="edit-section-detail">{{ label }}</span>
      </div>
      <div v-else class="edit-section-form">
        <div class="form-field">
          <label class="form-label" for="qe-source">Source</label>
          <select id="qe-source" v-model="source" class="form-input form-select">
            <option v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
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
          <p v-if="source === 'OTHER' && !sourceCustomName.trim()" class="form-field-error">
            Le nom de la source est requis
          </p>
        </div>
        <div class="form-field">
          <label class="form-label" for="qe-label">Libellé</label>
          <input
            id="qe-label"
            v-model="label"
            type="text"
            class="form-input"
            placeholder="Ex: Famille Martin"
          />
        </div>
      </div>
    </div>

    <!-- Section Détails -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'details' }">
      <div class="edit-section-header">
        <div class="edit-section-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="edit-section-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>DÉTAILS</span>
        </div>
        <button v-if="editingSection !== 'details'" class="edit-btn" @click="startEditing('details')">
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'details'" class="edit-section-summary">
        <div class="details-summary">
          <div v-if="externalAmount !== null" class="details-summary-line">
            <span>Montant reçu</span>
            <span class="details-summary-value">{{ formatPrice(externalAmount) }}</span>
          </div>
          <div v-else class="details-summary-line">
            <span>Montant reçu</span>
            <span class="details-summary-muted">Non renseigné</span>
          </div>
          <div class="details-summary-line">
            <span>Occupants</span>
            <span class="details-summary-value">{{ occupantsCount ?? '—' }}</span>
          </div>
          <div class="details-summary-line">
            <span>Adultes</span>
            <span class="details-summary-value">{{ adultsCount }}</span>
          </div>
        </div>
      </div>
      <div v-else class="edit-section-form">
        <div class="form-field">
          <label class="form-label" for="qe-amount">Montant reçu</label>
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
        <div class="form-row">
          <div class="form-field">
            <label class="form-label" for="qe-occupants">Occupants</label>
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
            <label class="form-label" for="qe-adults">Adultes</label>
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
      </div>
    </div>

    <!-- Section Notes -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'notes' }">
      <div class="edit-section-header">
        <div class="edit-section-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="edit-section-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>NOTES</span>
        </div>
        <button v-if="editingSection !== 'notes'" class="edit-btn" @click="startEditing('notes')">
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'notes'" class="edit-section-summary">
        <span v-if="notes" class="notes-text">{{ notes }}</span>
        <span v-else class="edit-section-detail">Aucune note</span>
      </div>
      <div v-else class="edit-section-form">
        <textarea
          id="qe-notes"
          v-model="notes"
          class="form-textarea"
          rows="3"
          placeholder="Notes internes..."
        ></textarea>
      </div>
    </div>

    <template #actions>
      <button class="modal-cancel-btn" :disabled="isSubmitting" @click="emit('close')">
        Annuler
      </button>
      <button class="modal-save-btn" :disabled="!canSave" @click="handleSave">
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
        {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Erreur */
.edit-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #dc2626;
}

.edit-error-close {
  padding: 4px 12px;
  background-color: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

/* Sections */
.edit-section {
  padding: 16px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.edit-section--editing {
  background-color: #eff6ff;
  border-color: #93c5fd;
}

.edit-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.edit-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.5px;
}

.edit-section-icon {
  width: 18px;
  height: 18px;
  color: #ff385c;
}

.edit-btn {
  padding: 7px 16px;
  background-color: #fff0f3;
  border: 1.5px solid #fecdd3;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #ff385c;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background-color: #ffe4e9;
  border-color: #ff385c;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 56, 92, 0.15);
}

.edit-section-actions {
  display: flex;
  gap: 8px;
}

.edit-action-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.edit-action-btn--cancel {
  background-color: #f3f4f6;
  color: #6b7280;
}

.edit-action-btn--cancel:hover {
  background-color: #e5e7eb;
}

.edit-action-btn--ok {
  background-color: #10b981;
  color: white;
}

.edit-action-btn--ok:hover {
  background-color: #059669;
}

/* Summary */
.edit-section-summary {
  font-size: 15px;
  color: #111827;
  line-height: 1.5;
}

.edit-section-detail {
  display: block;
  font-size: 13px;
  color: #6b7280;
}

.summary-name {
  font-weight: 600;
}

.notes-text {
  font-size: 14px;
  color: #374151;
  white-space: pre-wrap;
}

/* Details summary */
.details-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.details-summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #374151;
  padding: 2px 0;
}

.details-summary-value {
  font-weight: 500;
}

.details-summary-muted {
  color: #9ca3af;
  font-style: italic;
}

/* Form fields */
.edit-section-form {
  margin-top: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 15px;
  color: #111827;
  background-color: white;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #ff385c;
}

.form-input--error {
  border-color: #ef4444 !important;
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23717171' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

.form-textarea {
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 15px;
  color: #111827;
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
}

.form-field-error {
  font-size: 13px;
  color: #dc2626;
  margin-top: 4px;
  margin-bottom: 0;
}

.form-hint {
  margin: 4px 0 0;
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
  padding-right: 36px;
}

.input-suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  color: #717171;
  font-weight: 500;
  pointer-events: none;
}

/* Date fields */
.date-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-nights-info {
  margin: 8px 0 0;
  font-size: 14px;
  color: #6b7280;
}

/* Actions du modal */
.modal-cancel-btn {
  padding: 14px 28px;
  background-color: white;
  color: #6b7280;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 50px;
}

.modal-cancel-btn:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
}

.modal-cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-save-btn {
  padding: 14px 28px;
  background: linear-gradient(135deg, #ff385c, #e31c5f);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(255, 56, 92, 0.3);
  min-height: 50px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.modal-save-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #e31c5f, #c81e52);
  box-shadow: 0 6px 20px rgba(255, 56, 92, 0.4);
  transform: translateY(-1px);
}

.modal-save-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(255, 56, 92, 0.3);
}

.modal-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
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

  .edit-section-header {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
