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
  <div v-if="isReady" class="mx-auto max-w-xl px-4 py-8">
    <StepIndicator :current-step="2" :total-steps="2" label="Détails optionnels" />

    <!-- Recap banner -->
    <div class="mt-6">
      <RecapBanner
        :source="sourceDisplay"
        :booking-type="bookingType"
        :start-date="store.startDate"
        :end-date="store.endDate"
        :nights-count="store.nightsCount"
        @edit="router.push({ name: 'AdminQuickBookingStep1' })"
      />
    </div>

    <!-- Info bubble -->
    <div class="mt-4">
      <InfoBubble
        message="Ces informations sont facultatives. Vous pourrez compléter plus tard..."
        dismiss-key="quickBookingInfoDismissed"
      />
    </div>

    <!-- Optional fields form -->
    <form @submit.prevent="handleSubmit">
      <div class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div class="space-y-4">
          <!-- Label -->
          <div>
            <label for="label" class="mb-1 block text-sm font-medium text-dark">
              Nom / Label
              <span class="font-normal text-gray-400"> — Facultatif</span>
            </label>
            <input
              id="label"
              v-model="store.label"
              type="text"
              placeholder="Ex: Famille Dupont, Vacances été..."
              class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              style="min-height: 48px"
            />
          </div>

          <!-- External amount -->
          <div>
            <label for="externalAmount" class="mb-1 block text-sm font-medium text-dark">
              Montant reçu (€)
              <span class="font-normal text-gray-400"> — Facultatif</span>
            </label>
            <input
              id="externalAmount"
              v-model="externalAmountModel"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 850"
              class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              style="min-height: 48px"
            />
          </div>

          <!-- Occupants count -->
          <div>
            <label for="occupantsCount" class="mb-1 block text-sm font-medium text-dark">
              Nombre d'occupants
              <span class="font-normal text-gray-400"> — Facultatif</span>
            </label>
            <input
              id="occupantsCount"
              v-model="occupantsCountModel"
              type="number"
              min="1"
              max="6"
              placeholder="1 à 6"
              class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              style="min-height: 48px"
            />
          </div>

          <!-- Adults count -->
          <div>
            <label for="adultsCount" class="mb-1 block text-sm font-medium text-dark">
              Nombre d'adultes
            </label>
            <input
              id="adultsCount"
              v-model.number="store.adultsCount"
              type="number"
              min="1"
              max="6"
              class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              style="min-height: 48px"
            />
          </div>

          <!-- Notes -->
          <div>
            <label for="notes" class="mb-1 block text-sm font-medium text-dark">
              Notes
              <span class="font-normal text-gray-400"> — Facultatif</span>
            </label>
            <textarea
              id="notes"
              v-model="store.notes"
              rows="3"
              placeholder="Informations supplémentaires..."
              class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              style="min-height: 48px"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Error message -->
      <p v-if="errorMessage" class="mt-4 text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <!-- Actions -->
      <div class="mt-6 flex items-center justify-between">
        <router-link
          :to="{ name: 'AdminQuickBookingStep1' }"
          class="text-sm text-text hover:text-primary hover:underline"
        >
          ← Retour
        </router-link>

        <button
          type="submit"
          class="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          style="min-height: 48px"
          :disabled="isSubmitting"
        >
          <template v-if="isSubmitting">
            <svg
              class="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            En cours...
          </template>
          <template v-else> Créer la réservation </template>
        </button>
      </div>
    </form>
  </div>
</template>
