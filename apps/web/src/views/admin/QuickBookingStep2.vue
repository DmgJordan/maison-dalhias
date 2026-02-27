<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AxiosError } from 'axios';
import { useQuickBookingFormStore } from '../../stores/quickBookingForm';
import { bookingsApi, type BookingSource, type BookingType, type Booking } from '../../lib/api';
import StepIndicator from '../../components/admin/StepIndicator.vue';
import RecapBanner from '../../components/admin/RecapBanner.vue';
import InfoBubble from '../../components/admin/InfoBubble.vue';

const router = useRouter();
const store = useQuickBookingFormStore();

const isSubmitting = ref(false);
const errorMessage = ref('');
const isReady = ref(false);

onMounted(() => {
  if (!store.isStep1Valid) {
    router.replace({ name: 'AdminQuickBookingStep1' });
    return;
  }
  isReady.value = true;
});

function mapSourceToType(source: BookingSource): BookingType {
  switch (source) {
    case 'ABRITEL':
    case 'AIRBNB':
    case 'BOOKING_COM':
    case 'OTHER':
      return 'EXTERNAL';
    case 'PERSONNEL':
    case 'FAMILLE':
      return 'PERSONAL';
  }
}

const bookingType = computed((): BookingType => {
  if (!store.source) return 'EXTERNAL';
  return mapSourceToType(store.source as BookingSource);
});

const sourceDisplay = computed((): string => {
  return store.sourceDisplayName || (store.source as string);
});

const externalAmountModel = computed({
  get(): string {
    return store.externalAmount !== null ? String(store.externalAmount) : '';
  },
  set(val: string): void {
    const parsed = parseFloat(val);
    store.externalAmount = val === '' || isNaN(parsed) ? null : parsed;
  },
});

const occupantsCountModel = computed({
  get(): string {
    return store.occupantsCount !== null ? String(store.occupantsCount) : '';
  },
  set(val: string): void {
    const parsed = parseInt(val, 10);
    store.occupantsCount = val === '' || isNaN(parsed) ? null : parsed;
  },
});

async function handleSubmit(): Promise<void> {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      startDate: store.startDate,
      endDate: store.endDate,
      source: store.source as BookingSource,
      ...(store.source === 'OTHER' && store.sourceCustomName.trim()
        ? { sourceCustomName: store.sourceCustomName.trim() }
        : {}),
      ...(store.label.trim() ? { label: store.label.trim() } : {}),
      ...(store.externalAmount !== null ? { externalAmount: store.externalAmount } : {}),
      ...(store.occupantsCount !== null ? { occupantsCount: store.occupantsCount } : {}),
      ...(store.adultsCount > 1 ? { adultsCount: store.adultsCount } : {}),
      ...(store.notes.trim() ? { notes: store.notes.trim() } : {}),
    };

    const booking: Booking = await bookingsApi.createQuick(payload);

    // Capture data before store reset
    const successData = {
      bookingId: booking.id,
      source: sourceDisplay.value,
      bookingType: booking.bookingType,
      startDate: booking.startDate,
      endDate: booking.endDate,
      nightsCount: store.nightsCount,
      label: booking.label ?? null,
    };

    store.$reset();

    router.push({
      name: 'AdminQuickBookingSuccess',
      state: successData,
    });
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      errorMessage.value =
        "Ces dates ont été réservées entre-temps. Retournez à l'étape 1 pour vérifier.";
    } else {
      errorMessage.value = 'Erreur lors de la création. Veuillez réessayer.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="isReady" class="quick-step-view">
    <StepIndicator :steps="[{ label: 'Dates & source' }, { label: 'Détails' }]" :current-step="2" />

    <!-- Recap banner -->
    <RecapBanner
      :source="sourceDisplay"
      :booking-type="bookingType"
      :start-date="store.startDate"
      :end-date="store.endDate"
      :nights-count="store.nightsCount"
      @edit="router.push({ name: 'AdminQuickBookingStep1' })"
    />

    <!-- Info bubble -->
    <div class="info-spacer">
      <InfoBubble
        message="Ces informations sont facultatives. Vous pourrez compléter plus tard..."
        dismiss-key="quickBookingInfoDismissed"
      />
    </div>

    <!-- Optional fields form -->
    <form @submit.prevent="handleSubmit">
      <div class="step-content">
        <!-- Label -->
        <div class="form-group">
          <label for="label" class="form-label">
            Nom / Label
            <span class="form-hint-inline">— Facultatif</span>
          </label>
          <input
            id="label"
            v-model="store.label"
            type="text"
            placeholder="Ex : Famille Dupont, Vacances été..."
            class="form-input"
          />
        </div>

        <!-- External amount -->
        <div class="form-group">
          <label for="externalAmount" class="form-label">
            Montant reçu (€)
            <span class="form-hint-inline">— Facultatif</span>
          </label>
          <input
            id="externalAmount"
            v-model="externalAmountModel"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ex : 850"
            class="form-input"
          />
        </div>

        <!-- Occupants count -->
        <div class="form-group">
          <label for="occupantsCount" class="form-label">
            Nombre d'occupants
            <span class="form-hint-inline">— Facultatif</span>
          </label>
          <input
            id="occupantsCount"
            v-model="occupantsCountModel"
            type="number"
            min="1"
            max="6"
            placeholder="1 à 6"
            class="form-input"
          />
        </div>

        <!-- Adults count -->
        <div class="form-group">
          <label for="adultsCount" class="form-label">Nombre d'adultes</label>
          <input
            id="adultsCount"
            v-model.number="store.adultsCount"
            type="number"
            min="1"
            max="6"
            class="form-input"
          />
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="notes" class="form-label">
            Notes
            <span class="form-hint-inline">— Facultatif</span>
          </label>
          <textarea
            id="notes"
            v-model="store.notes"
            rows="3"
            placeholder="Informations supplémentaires..."
            class="form-input form-input--textarea"
          ></textarea>
        </div>
      </div>

      <!-- Error message -->
      <p v-if="errorMessage" class="form-field-error">
        {{ errorMessage }}
      </p>

      <!-- Navigation -->
      <div class="step-navigation">
        <router-link :to="{ name: 'AdminQuickBookingStep1' }" class="nav-btn nav-btn--prev">
          ← Retour
        </router-link>

        <button type="submit" class="nav-btn nav-btn--submit" :disabled="isSubmitting">
          <template v-if="isSubmitting">
            <svg
              class="loading-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                opacity="0.25"
              ></circle>
              <path
                fill="currentColor"
                opacity="0.75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            En cours...
          </template>
          <template v-else>Créer la réservation</template>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.quick-step-view {
  max-width: 500px;
  margin: 0 auto;
  padding: 0 16px 40px;
}

.info-spacer {
  margin-top: 16px;
  margin-bottom: 16px;
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

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #484848;
  margin-bottom: 8px;
}

.form-hint-inline {
  font-size: 13px;
  font-weight: 400;
  color: #717171;
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

.form-input--textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.form-field-error {
  font-size: 14px;
  color: #dc2626;
  margin-top: 6px;
  margin-bottom: 12px;
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

.nav-btn--submit {
  background-color: #10b981;
  color: white;
}

.nav-btn--submit:hover:not(:disabled) {
  background-color: #059669;
}

.loading-icon {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
