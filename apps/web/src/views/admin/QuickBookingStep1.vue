<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuickBookingFormStore, SOURCE_LABELS } from '../../stores/quickBookingForm';
import StepIndicator from '../../components/admin/StepIndicator.vue';
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
  <div class="mx-auto max-w-xl px-4 py-8">
    <StepIndicator :current-step="1" :total-steps="2" label="Dates & source" />

    <div class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <!-- Date pickers -->
      <div class="space-y-4">
        <div>
          <label for="startDate" class="mb-1 block text-sm font-medium text-dark">
            Date d'arrivée
          </label>
          <input
            id="startDate"
            v-model="store.startDate"
            type="date"
            class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            style="min-height: 48px"
          />
        </div>

        <div>
          <label for="endDate" class="mb-1 block text-sm font-medium text-dark">
            Date de départ
          </label>
          <input
            id="endDate"
            v-model="store.endDate"
            type="date"
            class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            style="min-height: 48px"
          />
        </div>

        <!-- Nights count -->
        <p v-if="store.nightsCount > 0" class="text-sm text-text">
          {{ store.nightsCount }} nuit{{ store.nightsCount > 1 ? 's' : '' }}
        </p>

        <!-- Checking indicator -->
        <p v-if="isCheckingConflict" class="text-sm text-gray-400">Vérification...</p>

        <!-- Conflict error -->
        <p v-if="hasConflict && conflictDetail && !isCheckingConflict" class="text-sm text-red-600">
          {{ buildConflictMessage(conflictDetail) }}
        </p>
      </div>

      <!-- Source dropdown -->
      <div class="mt-6">
        <label for="source" class="mb-1 block text-sm font-medium text-dark"> Source </label>
        <select
          id="source"
          v-model="store.source"
          class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          style="min-height: 48px"
        >
          <option value="" disabled>Choisir une source</option>
          <option v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Custom source name -->
      <div v-if="store.source === 'OTHER'" class="mt-4">
        <label for="sourceCustomName" class="mb-1 block text-sm font-medium text-dark">
          Nom de la source
        </label>
        <input
          id="sourceCustomName"
          v-model="store.sourceCustomName"
          type="text"
          placeholder="Ex: Leboncoin, Amis..."
          class="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          style="min-height: 48px"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-6 flex items-center justify-between">
      <router-link
        :to="{ name: 'AdminNewBooking' }"
        class="text-sm text-text hover:text-primary hover:underline"
      >
        ← Retour
      </router-link>

      <button
        type="button"
        class="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        style="min-height: 48px"
        :disabled="!canProceed"
        @click="goNext"
      >
        Suivant
      </button>
    </div>
  </div>
</template>
