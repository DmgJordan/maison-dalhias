<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { bookingsApi, type Booking, type Client, type EnrichBookingData } from '../../lib/api';
import { OPTION_PRICES } from '../../constants/pricing';
import { formatPrice, formatDateLong, countNights } from '../../utils/formatting';
import StepIndicator from '../../components/admin/StepIndicator.vue';
import SourceBadge from '../../components/admin/SourceBadge.vue';

const route = useRoute();
const router = useRouter();

const bookingId = computed((): string => route.params.id as string);

// Loading / error state
const booking = ref<Booking | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Wizard step (1-3)
const currentStep = ref(1);

// Step 1: Client info
const clientForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
  phone: '',
});
const showSecondaryClient = ref(false);
const secondaryClientForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
  phone: '',
});

// Step 2: Pricing & options
const rentalPrice = ref<number | null>(null);
const occupantsCount = ref(1);
const adultsCount = ref(1);
const cleaningIncluded = ref(false);
const cleaningOffered = ref(false);
const linenIncluded = ref(false);
const linenOffered = ref(false);
const touristTaxIncluded = ref(false);

// Computed
const nightsCount = computed((): number => {
  if (!booking.value) return 0;
  return countNights(booking.value.startDate, booking.value.endDate);
});

const enrichmentSteps = [
  { label: 'Client' },
  { label: 'Tarification' },
  { label: 'Récapitulatif' },
];

// Step 1 validation
const isStep1Valid = computed((): boolean => {
  const c = clientForm.value;
  const primaryValid =
    !!c.firstName.trim() &&
    !!c.lastName.trim() &&
    !!c.address.trim() &&
    !!c.city.trim() &&
    !!c.postalCode.trim() &&
    !!c.country.trim() &&
    !!c.phone.trim();

  if (!primaryValid) return false;

  if (showSecondaryClient.value) {
    const s = secondaryClientForm.value;
    return (
      !!s.firstName.trim() &&
      !!s.lastName.trim() &&
      !!s.address.trim() &&
      !!s.city.trim() &&
      !!s.postalCode.trim() &&
      !!s.country.trim() &&
      !!s.phone.trim()
    );
  }

  return true;
});

// Step 2 validation
const isStep2Valid = computed((): boolean => {
  return rentalPrice.value !== null && rentalPrice.value > 0;
});

// Price calculations
const cleaningPrice = computed((): number => {
  if (!cleaningIncluded.value || cleaningOffered.value) return 0;
  return OPTION_PRICES.CLEANING;
});

const linenPrice = computed((): number => {
  if (!linenIncluded.value || linenOffered.value) return 0;
  return OPTION_PRICES.LINEN_PER_PERSON * occupantsCount.value;
});

const touristTaxPrice = computed((): number => {
  if (!touristTaxIncluded.value) return 0;
  return OPTION_PRICES.TOURIST_TAX_PER_ADULT_PER_NIGHT * adultsCount.value * nightsCount.value;
});

const totalPrice = computed((): number => {
  const rental = rentalPrice.value ?? 0;
  return rental + cleaningPrice.value + linenPrice.value + touristTaxPrice.value;
});

const preFillFromBooking = (b: Booking): void => {
  // Pre-fill client from existing data
  if (b.primaryClient) {
    clientForm.value = {
      firstName: b.primaryClient.firstName,
      lastName: b.primaryClient.lastName,
      email: b.primaryClient.email ?? '',
      address: b.primaryClient.address,
      city: b.primaryClient.city,
      postalCode: b.primaryClient.postalCode,
      country: b.primaryClient.country,
      phone: b.primaryClient.phone,
    };
  } else if (b.label) {
    // Split "Prénom Nom" if space detected
    const parts = b.label.trim().split(/\s+/);
    if (parts.length >= 2) {
      clientForm.value.firstName = parts[0];
      clientForm.value.lastName = parts.slice(1).join(' ');
    } else {
      clientForm.value.lastName = b.label;
    }
  }

  // Pre-fill secondary client
  if (b.secondaryClient) {
    showSecondaryClient.value = true;
    secondaryClientForm.value = {
      firstName: b.secondaryClient.firstName,
      lastName: b.secondaryClient.lastName,
      email: b.secondaryClient.email ?? '',
      address: b.secondaryClient.address,
      city: b.secondaryClient.city,
      postalCode: b.secondaryClient.postalCode,
      country: b.secondaryClient.country,
      phone: b.secondaryClient.phone,
    };
  }

  // Pre-fill pricing
  if (b.rentalPrice != null) {
    rentalPrice.value =
      typeof b.rentalPrice === 'string' ? parseFloat(b.rentalPrice) : b.rentalPrice;
  }
  if (b.occupantsCount != null) {
    occupantsCount.value = b.occupantsCount;
  }
  adultsCount.value = b.adultsCount;
  cleaningIncluded.value = b.cleaningIncluded;
  cleaningOffered.value = b.cleaningOffered;
  linenIncluded.value = b.linenIncluded;
  linenOffered.value = b.linenOffered;
  touristTaxIncluded.value = b.touristTaxIncluded;
};

const fetchBooking = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    const b = await bookingsApi.getById(bookingId.value);

    // Redirect if DIRECT or CANCELLED
    if (b.bookingType === 'DIRECT' || b.status === 'CANCELLED') {
      await router.replace(`/admin/reservations/${bookingId.value}`);
      return;
    }

    booking.value = b;
    preFillFromBooking(b);
  } catch (err: unknown) {
    console.error('Erreur lors du chargement:', err);
    error.value = 'Impossible de charger la réservation.';
  } finally {
    loading.value = false;
  }
};

const goNext = (): void => {
  if (currentStep.value < 3) {
    currentStep.value++;
  }
};

const goPrev = (): void => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const goCancel = (): void => {
  router.push(`/admin/reservations/${bookingId.value}`);
};

const buildClientData = (form: typeof clientForm.value): Omit<Client, 'id'> => {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim() || undefined,
    address: form.address.trim(),
    city: form.city.trim(),
    postalCode: form.postalCode.trim(),
    country: form.country.trim(),
    phone: form.phone.trim(),
  } as Omit<Client, 'id'>;
};

const handleSubmit = async (): Promise<void> => {
  if (!booking.value) return;

  try {
    submitting.value = true;
    error.value = null;

    const payload: EnrichBookingData = {
      primaryClient: buildClientData(clientForm.value),
      rentalPrice: rentalPrice.value ?? undefined,
      cleaningIncluded: cleaningIncluded.value,
      cleaningOffered: cleaningOffered.value,
      linenIncluded: linenIncluded.value,
      linenOffered: linenOffered.value,
      touristTaxIncluded: touristTaxIncluded.value,
      occupantsCount: occupantsCount.value,
      adultsCount: adultsCount.value,
    };

    if (showSecondaryClient.value) {
      payload.secondaryClient = buildClientData(secondaryClientForm.value);
    }

    await bookingsApi.enrich(bookingId.value, payload);
    successMessage.value = 'Réservation enrichie avec succès';
    setTimeout(() => {
      router.push(`/admin/reservations/${bookingId.value}`);
    }, 800);
  } catch (err: unknown) {
    console.error("Erreur lors de l'enrichissement:", err);
    error.value = "Impossible d'enrichir la réservation. Veuillez réessayer.";
  } finally {
    submitting.value = false;
  }
};

onMounted(fetchBooking);
</script>

<template>
  <div class="enrichment-wizard">
    <!-- Success toast -->
    <Transition name="fade">
      <div v-if="successMessage" class="success-toast">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="toast-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Error banner -->
    <Transition name="fade">
      <div v-if="error" class="error-banner">
        <span>{{ error }}</span>
        <button class="error-close" @click="error = null">Fermer</button>
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement...</p>
    </div>

    <template v-else-if="booking">
      <!-- Recap banner -->
      <div class="recap-banner">
        <button class="back-btn" @click="goCancel">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Retour
        </button>
        <div class="recap-info">
          <div class="recap-badges">
            <SourceBadge
              :source="booking.source ?? 'DIRECT'"
              :booking-type="booking.bookingType ?? 'DIRECT'"
              size="sm"
            />
            <span class="recap-dates">
              {{ formatDateLong(booking.startDate) }} - {{ formatDateLong(booking.endDate) }}
            </span>
          </div>
          <span class="recap-nights">{{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Step indicator -->
      <div class="step-indicator-wrapper">
        <StepIndicator :steps="enrichmentSteps" :current-step="currentStep" />
      </div>

      <!-- Step 1: Client information -->
      <div v-if="currentStep === 1" class="wizard-step">
        <h2 class="step-title">Informations du client principal</h2>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="firstName">Prénom *</label>
            <input
              id="firstName"
              v-model="clientForm.firstName"
              type="text"
              class="form-input"
              placeholder="Prénom du client"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="lastName">Nom *</label>
            <input
              id="lastName"
              v-model="clientForm.lastName"
              type="text"
              class="form-input"
              placeholder="Nom du client"
            />
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="email">Email</label>
            <input
              id="email"
              v-model="clientForm.email"
              type="email"
              class="form-input"
              placeholder="email@exemple.com"
            />
          </div>

          <div class="form-group form-group--full">
            <label class="form-label" for="address">Adresse *</label>
            <input
              id="address"
              v-model="clientForm.address"
              type="text"
              class="form-input"
              placeholder="Adresse postale"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="postalCode">Code postal *</label>
            <input
              id="postalCode"
              v-model="clientForm.postalCode"
              type="text"
              class="form-input"
              placeholder="Code postal"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="city">Ville *</label>
            <input
              id="city"
              v-model="clientForm.city"
              type="text"
              class="form-input"
              placeholder="Ville"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="country">Pays *</label>
            <input
              id="country"
              v-model="clientForm.country"
              type="text"
              class="form-input"
              placeholder="Pays"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="phone">Téléphone *</label>
            <input
              id="phone"
              v-model="clientForm.phone"
              type="tel"
              class="form-input"
              placeholder="+33 6 00 00 00 00"
            />
          </div>
        </div>

        <!-- Secondary client toggle -->
        <div class="secondary-toggle">
          <label class="toggle-label">
            <input v-model="showSecondaryClient" type="checkbox" class="toggle-checkbox" />
            <span>Ajouter un second locataire</span>
          </label>
        </div>

        <!-- Secondary client form -->
        <template v-if="showSecondaryClient">
          <h3 class="step-subtitle">Second locataire</h3>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="sec-firstName">Prénom *</label>
              <input
                id="sec-firstName"
                v-model="secondaryClientForm.firstName"
                type="text"
                class="form-input"
                placeholder="Prénom"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sec-lastName">Nom *</label>
              <input
                id="sec-lastName"
                v-model="secondaryClientForm.lastName"
                type="text"
                class="form-input"
                placeholder="Nom"
              />
            </div>
            <div class="form-group form-group--full">
              <label class="form-label" for="sec-email">Email</label>
              <input
                id="sec-email"
                v-model="secondaryClientForm.email"
                type="email"
                class="form-input"
                placeholder="email@exemple.com"
              />
            </div>
            <div class="form-group form-group--full">
              <label class="form-label" for="sec-address">Adresse *</label>
              <input
                id="sec-address"
                v-model="secondaryClientForm.address"
                type="text"
                class="form-input"
                placeholder="Adresse postale"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sec-postalCode">Code postal *</label>
              <input
                id="sec-postalCode"
                v-model="secondaryClientForm.postalCode"
                type="text"
                class="form-input"
                placeholder="Code postal"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sec-city">Ville *</label>
              <input
                id="sec-city"
                v-model="secondaryClientForm.city"
                type="text"
                class="form-input"
                placeholder="Ville"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sec-country">Pays *</label>
              <input
                id="sec-country"
                v-model="secondaryClientForm.country"
                type="text"
                class="form-input"
                placeholder="Pays"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="sec-phone">Téléphone *</label>
              <input
                id="sec-phone"
                v-model="secondaryClientForm.phone"
                type="tel"
                class="form-input"
                placeholder="+33 6 00 00 00 00"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Step 2: Pricing & options -->
      <div v-if="currentStep === 2" class="wizard-step">
        <h2 class="step-title">Tarification et options</h2>

        <div class="form-grid">
          <div class="form-group form-group--full">
            <label class="form-label" for="rentalPrice">Prix de la location (EUR) *</label>
            <input
              id="rentalPrice"
              v-model.number="rentalPrice"
              type="number"
              min="0"
              step="0.01"
              class="form-input"
              placeholder="Ex: 560"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="occupantsCount">Nombre d'occupants</label>
            <input
              id="occupantsCount"
              v-model.number="occupantsCount"
              type="number"
              min="1"
              max="6"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="adultsCount">Nombre d'adultes</label>
            <input
              id="adultsCount"
              v-model.number="adultsCount"
              type="number"
              min="1"
              max="6"
              class="form-input"
            />
          </div>
        </div>

        <!-- Options toggles -->
        <div class="options-section">
          <h3 class="step-subtitle">Options</h3>

          <div class="option-row">
            <label class="toggle-label">
              <input v-model="cleaningIncluded" type="checkbox" class="toggle-checkbox" />
              <span>Ménage fin de séjour ({{ OPTION_PRICES.CLEANING }} EUR)</span>
            </label>
            <label v-if="cleaningIncluded" class="toggle-label toggle-label--sub">
              <input v-model="cleaningOffered" type="checkbox" class="toggle-checkbox" />
              <span>Offert</span>
            </label>
          </div>

          <div class="option-row">
            <label class="toggle-label">
              <input v-model="linenIncluded" type="checkbox" class="toggle-checkbox" />
              <span>Linge de maison ({{ OPTION_PRICES.LINEN_PER_PERSON }} EUR/pers.)</span>
            </label>
            <label v-if="linenIncluded" class="toggle-label toggle-label--sub">
              <input v-model="linenOffered" type="checkbox" class="toggle-checkbox" />
              <span>Offert</span>
            </label>
          </div>

          <div class="option-row">
            <label class="toggle-label">
              <input v-model="touristTaxIncluded" type="checkbox" class="toggle-checkbox" />
              <span
                >Taxe de séjour ({{
                  OPTION_PRICES.TOURIST_TAX_PER_ADULT_PER_NIGHT
                }}
                EUR/adulte/nuit)</span
              >
            </label>
          </div>
        </div>

        <!-- Live price calculation -->
        <div class="price-summary">
          <h3 class="step-subtitle">Estimation du total</h3>
          <div class="price-line">
            <span>Location</span>
            <span>{{ formatPrice(rentalPrice ?? 0) }}</span>
          </div>
          <div v-if="cleaningPrice > 0" class="price-line">
            <span>Ménage</span>
            <span>{{ formatPrice(cleaningPrice) }}</span>
          </div>
          <div v-if="linenPrice > 0" class="price-line">
            <span>Linge ({{ occupantsCount }} pers.)</span>
            <span>{{ formatPrice(linenPrice) }}</span>
          </div>
          <div v-if="touristTaxPrice > 0" class="price-line">
            <span>Taxe de séjour ({{ adultsCount }} ad. x {{ nightsCount }} nuits)</span>
            <span>{{ formatPrice(touristTaxPrice) }}</span>
          </div>
          <div class="price-line price-line--total">
            <span>Total</span>
            <span>{{ formatPrice(totalPrice) }}</span>
          </div>
        </div>
      </div>

      <!-- Step 3: Recap & submit -->
      <div v-if="currentStep === 3" class="wizard-step">
        <h2 class="step-title">Récapitulatif</h2>

        <!-- Dates -->
        <div class="recap-section">
          <h3 class="recap-label">Séjour</h3>
          <p class="recap-value">
            {{ formatDateLong(booking.startDate) }} - {{ formatDateLong(booking.endDate) }} ({{
              nightsCount
            }}
            nuit{{ nightsCount > 1 ? 's' : '' }})
          </p>
        </div>

        <!-- Client -->
        <div class="recap-section">
          <h3 class="recap-label">Client principal</h3>
          <p class="recap-value">{{ clientForm.firstName }} {{ clientForm.lastName }}</p>
          <p class="recap-value recap-value--secondary">
            {{ clientForm.address }}, {{ clientForm.postalCode }} {{ clientForm.city }}
          </p>
          <p class="recap-value recap-value--secondary">{{ clientForm.phone }}</p>
          <p v-if="clientForm.email" class="recap-value recap-value--secondary">
            {{ clientForm.email }}
          </p>
        </div>

        <!-- Secondary client -->
        <div v-if="showSecondaryClient" class="recap-section">
          <h3 class="recap-label">Second locataire</h3>
          <p class="recap-value">
            {{ secondaryClientForm.firstName }} {{ secondaryClientForm.lastName }}
          </p>
          <p class="recap-value recap-value--secondary">
            {{ secondaryClientForm.address }}, {{ secondaryClientForm.postalCode }}
            {{ secondaryClientForm.city }}
          </p>
          <p class="recap-value recap-value--secondary">{{ secondaryClientForm.phone }}</p>
          <p v-if="secondaryClientForm.email" class="recap-value recap-value--secondary">
            {{ secondaryClientForm.email }}
          </p>
        </div>

        <!-- Pricing breakdown -->
        <div class="recap-section">
          <h3 class="recap-label">Tarification</h3>
          <div class="price-line">
            <span>Location</span>
            <span>{{ formatPrice(rentalPrice ?? 0) }}</span>
          </div>
          <div v-if="cleaningPrice > 0" class="price-line">
            <span>Ménage{{ cleaningOffered ? ' (offert)' : '' }}</span>
            <span>{{ formatPrice(cleaningPrice) }}</span>
          </div>
          <div v-if="linenPrice > 0" class="price-line">
            <span>Linge ({{ occupantsCount }} pers.){{ linenOffered ? ' (offert)' : '' }}</span>
            <span>{{ formatPrice(linenPrice) }}</span>
          </div>
          <div v-if="touristTaxPrice > 0" class="price-line">
            <span>Taxe de séjour</span>
            <span>{{ formatPrice(touristTaxPrice) }}</span>
          </div>
          <div class="price-line price-line--total">
            <span>Total</span>
            <span>{{ formatPrice(totalPrice) }}</span>
          </div>
        </div>

        <!-- Options -->
        <div class="recap-section">
          <h3 class="recap-label">Options</h3>
          <p class="recap-value">
            {{ occupantsCount }} occupant{{ occupantsCount > 1 ? 's' : '' }},
            {{ adultsCount }} adulte{{ adultsCount > 1 ? 's' : '' }}
          </p>
          <p class="recap-value recap-value--secondary">
            Ménage :
            {{ cleaningIncluded ? (cleaningOffered ? 'Inclus (offert)' : 'Inclus') : 'Non' }}
          </p>
          <p class="recap-value recap-value--secondary">
            Linge : {{ linenIncluded ? (linenOffered ? 'Inclus (offert)' : 'Inclus') : 'Non' }}
          </p>
          <p class="recap-value recap-value--secondary">
            Taxe de séjour : {{ touristTaxIncluded ? 'Incluse' : 'Non' }}
          </p>
        </div>
      </div>

      <!-- Navigation buttons -->
      <div class="wizard-actions">
        <button v-if="currentStep > 1" class="btn btn--secondary" @click="goPrev">Précédent</button>
        <button v-else class="btn btn--secondary" @click="goCancel">Annuler</button>

        <button
          v-if="currentStep < 3"
          class="btn btn--primary"
          :disabled="(currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)"
          @click="goNext"
        >
          Suivant
        </button>

        <button
          v-if="currentStep === 3"
          class="btn btn--primary btn--full"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.enrichment-wizard {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
}

.success-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.error-close {
  background: none;
  border: none;
  color: #dc2626;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  gap: 16px;
  color: #6b7280;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Recap banner */
.recap-banner {
  background-color: #f9f9f9;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.back-btn:hover {
  color: #374151;
}

.recap-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recap-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.recap-dates {
  font-size: 15px;
  font-weight: 600;
  color: #222;
}

.recap-nights {
  font-size: 14px;
  color: #6b7280;
}

/* Step indicator */
.step-indicator-wrapper {
  margin-bottom: 24px;
}

/* Wizard step */
.wizard-step {
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
  margin-bottom: 20px;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #222;
  margin: 0 0 20px;
}

.step-subtitle {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 20px 0 12px;
}

/* Form grid */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group--full {
  grid-column: 1 / -1;
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
  font-family: inherit;
  color: #222;
  background: #fff;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #ff385c;
}

.form-input::placeholder {
  color: #9ca3af;
}

/* Secondary client toggle */
.secondary-toggle {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

/* Toggle labels */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 16px;
  color: #374151;
}

.toggle-label--sub {
  margin-left: 32px;
  font-size: 14px;
  color: #6b7280;
}

.toggle-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #ff385c;
  cursor: pointer;
}

/* Options section */
.options-section {
  margin-top: 8px;
}

.option-row {
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row:last-child {
  border-bottom: none;
}

/* Price summary */
.price-summary {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
}

.price-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 15px;
  color: #374151;
}

.price-line--total {
  border-top: 2px solid #e5e5e5;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 700;
  font-size: 18px;
  color: #222;
}

/* Recap sections */
.recap-section {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.recap-section:last-child {
  margin-bottom: 0;
}

.recap-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  margin: 0 0 8px;
}

.recap-value {
  font-size: 16px;
  color: #222;
  margin: 0 0 4px;
}

.recap-value--secondary {
  font-size: 14px;
  color: #6b7280;
}

/* Navigation buttons */
.wizard-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.btn {
  min-height: 56px;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn--primary {
  background-color: #ff385c;
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: #e31c5f;
}

.btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn--secondary {
  background-color: #f3f4f6;
  color: #484848;
}

.btn--secondary:hover {
  background-color: #e5e5e5;
}

.btn--full {
  flex: 2;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Desktop responsive */
@media (min-width: 1024px) {
  .wizard-step {
    padding: 32px;
  }

  .step-title {
    font-size: 24px;
  }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group--full {
    grid-column: 1;
  }
}
</style>
