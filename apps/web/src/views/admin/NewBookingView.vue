<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNewBookingFormStore, type ClientFormData } from '../../stores/newBookingForm';
import { bookingsApi } from '../../lib/api';
import DatePicker from '../../components/admin/DatePicker.vue';
import { formatDateLong, formatPrice } from '../../utils/formatting';
import { required, email, phone, postalCode } from '../../utils/validation';
import { COUNTRIES } from '../../constants/property';
import {
  useFormValidation,
  type UseFormValidationReturn,
} from '../../composables/useFormValidation';
import type { ValidationSchema } from '../../utils/validation';

const router = useRouter();
const formStore = useNewBookingFormStore();

const clientSchema: ValidationSchema<ClientFormData> = {
  firstName: [required('Le prénom est obligatoire')],
  lastName: [required('Le nom est obligatoire')],
  address: [required("L'adresse est obligatoire")],
  postalCode: [required('Le code postal est obligatoire'), postalCode()],
  city: [required('La ville est obligatoire')],
  phone: [required('Le téléphone est obligatoire'), phone()],
  email: [required("L'email est obligatoire"), email()],
};

const step2Validation: UseFormValidationReturn<ClientFormData> = useFormValidation({
  schema: clientSchema,
  formData: () => formStore.primaryClient,
});

const loading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const bookedDates = ref<string[]>([]);

const steps = [
  { number: 1, label: 'Dates' },
  { number: 2, label: 'Client' },
  { number: 3, label: 'Occupants' },
  { number: 4, label: 'Options' },
  { number: 5, label: 'Tarif' },
  { number: 6, label: 'Recapitulatif' },
];

const currentStep = computed(() => formStore.currentStep);

const minDate = computed((): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

const minEndDate = computed((): string => {
  if (!formStore.startDate) return minDate.value;
  const start = new Date(formStore.startDate);
  start.setDate(start.getDate() + 3); // Minimum 3 nuits
  return start.toISOString().split('T')[0];
});

const fetchBookedDates = async (): Promise<void> => {
  try {
    bookedDates.value = await bookingsApi.getBookedDates();
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des dates:', error);
  }
};

const checkDateConflicts = async (): Promise<boolean> => {
  if (!formStore.startDate || !formStore.endDate) return false;
  try {
    const result = await bookingsApi.checkConflicts(formStore.startDate, formStore.endDate);
    // Mettre à jour le minimum de nuits requis dans le store
    formStore.minNightsRequired = result.minNightsRequired;
    return result.hasConflict;
  } catch (error: unknown) {
    console.error('Erreur lors de la verification des conflits:', error);
    return true;
  }
};

const handleNext = async (): Promise<void> => {
  error.value = null;

  // Verification speciale pour l'etape 1 (dates)
  if (currentStep.value === 1) {
    const hasConflict = await checkDateConflicts();
    if (hasConflict) {
      error.value = "Ces dates sont déjà réservées. Veuillez choisir d'autres dates.";
      return;
    }
  }

  // Validation de l'etape 2 (client) avec feedback inline
  if (currentStep.value === 2) {
    if (!step2Validation.attemptSubmit()) return;
  }

  // Calculer le prix suggere quand on passe a l'etape 5
  if (currentStep.value === 4) {
    await formStore.calculateSuggestedPrice();
  }

  formStore.nextStep();
};

const handlePrev = (): void => {
  error.value = null;
  formStore.prevStep();
};

const handleSubmit = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;

    const bookingData = formStore.getBookingData();
    await bookingsApi.create(bookingData);

    successMessage.value = 'Réservation créée avec succès !';
    formStore.reset();

    setTimeout(() => {
      router.push('/admin/reservations');
    }, 2000);
  } catch (err: unknown) {
    console.error('Erreur lors de la creation de la reservation:', err);
    error.value = 'Impossible de créer la réservation. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
};

const handleReset = (): void => {
  formStore.reset();
  step2Validation.resetTouched();
  error.value = null;
};

// Reinitialiser offered quand l'option est decochee
watch(
  () => formStore.cleaningIncluded,
  (included) => {
    if (!included) formStore.cleaningOffered = false;
  }
);

watch(
  () => formStore.linenIncluded,
  (included) => {
    if (!included) formStore.linenOffered = false;
  }
);

// Mettre a jour adultsCount quand occupantsCount change
watch(
  () => formStore.occupantsCount,
  (newCount) => {
    if (formStore.adultsCount > newCount) {
      formStore.adultsCount = newCount;
    }
  }
);

// Reinitialiser la date de fin si elle devient invalide apres changement de date de debut
watch(
  () => formStore.startDate,
  (newStartDate) => {
    if (newStartDate && formStore.endDate) {
      const end = new Date(formStore.endDate);
      const minEnd = new Date(newStartDate);
      minEnd.setDate(minEnd.getDate() + 3);

      // Si la date de fin est avant la nouvelle date minimum, la reinitialiser
      if (end < minEnd) {
        formStore.endDate = '';
      }
    }
  }
);

onMounted(() => {
  void fetchBookedDates();
});
</script>

<template>
  <div class="new-booking-view">
    <!-- Message de succes -->
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

    <!-- Indicateur de progression -->
    <div class="progress-bar">
      <div
        v-for="step in steps"
        :key="step.number"
        class="progress-step"
        :class="{
          'progress-step--active': step.number === currentStep,
          'progress-step--completed': step.number < currentStep,
        }"
      >
        <div class="step-circle">
          <svg
            v-if="step.number < currentStep"
            xmlns="http://www.w3.org/2000/svg"
            class="check-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span v-else>{{ step.number }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- Message d'erreur -->
    <Transition name="fade">
      <div v-if="error" class="error-banner">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="error-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
        <button class="error-close" @click="error = null">Fermer</button>
      </div>
    </Transition>

    <!-- Contenu des etapes -->
    <div class="step-content">
      <!-- Etape 1 : Dates -->
      <div v-if="currentStep === 1" class="step-panel">
        <h2 class="step-title">Quand arrive le client ?</h2>
        <p class="step-description">
          Sélectionnez les dates de séjour (minimum {{ formStore.minNightsRequired }} nuits)
        </p>

        <div class="form-group">
          <DatePicker
            v-model="formStore.startDate"
            label="Date d'arrivée"
            placeholder="Choisir la date d'arrivée"
            :min-date="minDate"
            :disabled-dates="bookedDates"
          />
        </div>

        <div class="form-group">
          <DatePicker
            v-model="formStore.endDate"
            label="Date de départ"
            placeholder="Choisir la date de départ"
            :min-date="minEndDate"
            :disabled="!formStore.startDate"
            :disabled-dates="bookedDates"
          />
        </div>

        <div v-if="formStore.nightsCount > 0" class="date-summary">
          <div class="summary-item">
            <span class="summary-label">Durée</span>
            <span class="summary-value"
              >{{ formStore.nightsCount }} nuit{{ formStore.nightsCount > 1 ? 's' : '' }}</span
            >
          </div>
        </div>

        <p v-if="formStore.minNightsError" class="form-error">
          {{ formStore.minNightsError }}
        </p>
      </div>

      <!-- Etape 2 : Client -->
      <div v-if="currentStep === 2" class="step-panel">
        <h2 class="step-title">Qui est le client ?</h2>
        <p class="step-description">Informations du locataire principal</p>

        <div class="form-row">
          <div class="form-group">
            <label for="firstName" class="form-label"
              >Prénom<span class="form-required">*</span></label
            >
            <input
              id="firstName"
              v-model="formStore.primaryClient.firstName"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': step2Validation.hasFieldError('firstName') }"
              placeholder="Jean"
              :aria-invalid="step2Validation.hasFieldError('firstName') ? 'true' : undefined"
              :aria-describedby="
                step2Validation.hasFieldError('firstName')
                  ? step2Validation.errorId('firstName')
                  : undefined
              "
              @blur="step2Validation.touchField('firstName')"
            />
            <p
              v-if="step2Validation.fieldError('firstName')"
              :id="step2Validation.errorId('firstName')"
              class="form-field-error"
              role="alert"
            >
              {{ step2Validation.fieldError('firstName') }}
            </p>
          </div>
          <div class="form-group">
            <label for="lastName" class="form-label">Nom<span class="form-required">*</span></label>
            <input
              id="lastName"
              v-model="formStore.primaryClient.lastName"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': step2Validation.hasFieldError('lastName') }"
              placeholder="Dupont"
              :aria-invalid="step2Validation.hasFieldError('lastName') ? 'true' : undefined"
              :aria-describedby="
                step2Validation.hasFieldError('lastName')
                  ? step2Validation.errorId('lastName')
                  : undefined
              "
              @blur="step2Validation.touchField('lastName')"
            />
            <p
              v-if="step2Validation.fieldError('lastName')"
              :id="step2Validation.errorId('lastName')"
              class="form-field-error"
              role="alert"
            >
              {{ step2Validation.fieldError('lastName') }}
            </p>
          </div>
        </div>

        <div class="form-group">
          <label for="address" class="form-label"
            >Adresse<span class="form-required">*</span></label
          >
          <input
            id="address"
            v-model="formStore.primaryClient.address"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': step2Validation.hasFieldError('address') }"
            placeholder="12 rue de la Paix"
            :aria-invalid="step2Validation.hasFieldError('address') ? 'true' : undefined"
            :aria-describedby="
              step2Validation.hasFieldError('address')
                ? step2Validation.errorId('address')
                : undefined
            "
            @blur="step2Validation.touchField('address')"
          />
          <p
            v-if="step2Validation.fieldError('address')"
            :id="step2Validation.errorId('address')"
            class="form-field-error"
            role="alert"
          >
            {{ step2Validation.fieldError('address') }}
          </p>
        </div>

        <div class="form-group">
          <label for="country" class="form-label">Pays<span class="form-required">*</span></label>
          <select id="country" v-model="formStore.primaryClient.country" class="form-input">
            <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group form-group--small">
            <label for="postalCode" class="form-label"
              >Code postal<span class="form-required">*</span></label
            >
            <input
              id="postalCode"
              v-model="formStore.primaryClient.postalCode"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': step2Validation.hasFieldError('postalCode') }"
              placeholder="75001"
              maxlength="10"
              :aria-invalid="step2Validation.hasFieldError('postalCode') ? 'true' : undefined"
              :aria-describedby="
                step2Validation.hasFieldError('postalCode')
                  ? step2Validation.errorId('postalCode')
                  : undefined
              "
              @blur="step2Validation.touchField('postalCode')"
            />
            <p
              v-if="step2Validation.fieldError('postalCode')"
              :id="step2Validation.errorId('postalCode')"
              class="form-field-error"
              role="alert"
            >
              {{ step2Validation.fieldError('postalCode') }}
            </p>
          </div>
          <div class="form-group">
            <label for="city" class="form-label">Ville<span class="form-required">*</span></label>
            <input
              id="city"
              v-model="formStore.primaryClient.city"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': step2Validation.hasFieldError('city') }"
              placeholder="Paris"
              :aria-invalid="step2Validation.hasFieldError('city') ? 'true' : undefined"
              :aria-describedby="
                step2Validation.hasFieldError('city') ? step2Validation.errorId('city') : undefined
              "
              @blur="step2Validation.touchField('city')"
            />
            <p
              v-if="step2Validation.fieldError('city')"
              :id="step2Validation.errorId('city')"
              class="form-field-error"
              role="alert"
            >
              {{ step2Validation.fieldError('city') }}
            </p>
          </div>
        </div>

        <div class="form-group">
          <label for="phone" class="form-label"
            >Téléphone<span class="form-required">*</span></label
          >
          <input
            id="phone"
            v-model="formStore.primaryClient.phone"
            type="tel"
            class="form-input"
            :class="{ 'form-input--error': step2Validation.hasFieldError('phone') }"
            placeholder="+33 6 12 34 56 78"
            :aria-invalid="step2Validation.hasFieldError('phone') ? 'true' : undefined"
            :aria-describedby="
              step2Validation.hasFieldError('phone') ? step2Validation.errorId('phone') : undefined
            "
            @blur="step2Validation.touchField('phone')"
          />
          <p
            v-if="step2Validation.fieldError('phone')"
            :id="step2Validation.errorId('phone')"
            class="form-field-error"
            role="alert"
          >
            {{ step2Validation.fieldError('phone') }}
          </p>
        </div>

        <div class="form-group">
          <label for="email" class="form-label">Email<span class="form-required">*</span></label>
          <input
            id="email"
            v-model="formStore.primaryClient.email"
            type="email"
            class="form-input"
            :class="{ 'form-input--error': step2Validation.hasFieldError('email') }"
            placeholder="jean.dupont@email.fr"
            :aria-invalid="step2Validation.hasFieldError('email') ? 'true' : undefined"
            :aria-describedby="
              step2Validation.hasFieldError('email') ? step2Validation.errorId('email') : undefined
            "
            @blur="step2Validation.touchField('email')"
          />
          <p
            v-if="step2Validation.fieldError('email')"
            :id="step2Validation.errorId('email')"
            class="form-field-error"
            role="alert"
          >
            {{ step2Validation.fieldError('email') }}
          </p>
        </div>

        <!-- Client secondaire -->
        <div class="secondary-toggle">
          <label class="toggle-label">
            <input v-model="formStore.hasSecondaryClient" type="checkbox" class="toggle-input" />
            <span class="toggle-text">Ajouter un second locataire</span>
          </label>
        </div>

        <template v-if="formStore.hasSecondaryClient">
          <div class="form-divider"></div>
          <p class="form-subtitle">Second locataire</p>
          <div class="form-row">
            <div class="form-group">
              <label for="secondFirstName" class="form-label">Prénom</label>
              <input
                id="secondFirstName"
                v-model="formStore.secondaryClient.firstName"
                type="text"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="secondLastName" class="form-label">Nom</label>
              <input
                id="secondLastName"
                v-model="formStore.secondaryClient.lastName"
                type="text"
                class="form-input"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Etape 3 : Occupants -->
      <div v-if="currentStep === 3" class="step-panel">
        <h2 class="step-title">Combien de personnes ?</h2>
        <p class="step-description">Maximum 6 personnes</p>

        <div class="form-group">
          <label class="form-label">Nombre total d'occupants</label>
          <div class="counter-input">
            <button
              class="counter-btn"
              :disabled="formStore.occupantsCount <= 1"
              @click="formStore.occupantsCount--"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <span class="counter-value">{{ formStore.occupantsCount }}</span>
            <button
              class="counter-btn"
              :disabled="formStore.occupantsCount >= 6"
              @click="formStore.occupantsCount++"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dont adultes (pour la taxe de séjour)</label>
          <div class="counter-input">
            <button
              class="counter-btn"
              :disabled="formStore.adultsCount <= 1"
              @click="formStore.adultsCount--"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <span class="counter-value">{{ formStore.adultsCount }}</span>
            <button
              class="counter-btn"
              :disabled="formStore.adultsCount >= formStore.occupantsCount"
              @click="formStore.adultsCount++"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <p class="form-hint">Les mineurs sont exemptés de taxe de séjour (0,80 €/nuit/adulte)</p>
        </div>
      </div>

      <!-- Etape 4 : Options -->
      <div v-if="currentStep === 4" class="step-panel">
        <h2 class="step-title">Options du séjour</h2>
        <p class="step-description">Cochez les options souhaitées</p>

        <div class="options-list">
          <label
            class="option-card"
            :class="{
              'option-card--selected': formStore.cleaningIncluded,
              'option-card--offered': formStore.cleaningIncluded && formStore.cleaningOffered,
            }"
          >
            <input v-model="formStore.cleaningIncluded" type="checkbox" class="option-input" />
            <div class="option-content">
              <div class="option-header">
                <span class="option-name">Ménage fin de séjour</span>
                <span v-if="formStore.cleaningOffered" class="option-badge-offered">Offert</span>
                <span v-else class="option-price">80 €</span>
              </div>
              <p class="option-description">Nettoyage complet (hors vaisselle et cuisine)</p>
            </div>
            <div class="option-check">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </label>

          <Transition name="fade">
            <div v-if="formStore.cleaningIncluded" class="offer-toggle">
              <label class="offer-toggle-label">
                <input
                  v-model="formStore.cleaningOffered"
                  type="checkbox"
                  class="offer-toggle-input"
                />
                <span class="offer-toggle-text">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="gift-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                  Offrir cette option
                </span>
              </label>
            </div>
          </Transition>

          <label
            class="option-card"
            :class="{
              'option-card--selected': formStore.linenIncluded,
              'option-card--offered': formStore.linenIncluded && formStore.linenOffered,
            }"
          >
            <input v-model="formStore.linenIncluded" type="checkbox" class="option-input" />
            <div class="option-content">
              <div class="option-header">
                <span class="option-name">Linge de maison</span>
                <span v-if="formStore.linenOffered" class="option-badge-offered">Offert</span>
                <span v-else class="option-price">15 €/personne</span>
              </div>
              <p class="option-description">Draps, serviettes et torchons fournis</p>
            </div>
            <div class="option-check">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </label>

          <Transition name="fade">
            <div v-if="formStore.linenIncluded" class="offer-toggle">
              <label class="offer-toggle-label">
                <input
                  v-model="formStore.linenOffered"
                  type="checkbox"
                  class="offer-toggle-input"
                />
                <span class="offer-toggle-text">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="gift-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                  Offrir cette option
                </span>
              </label>
            </div>
          </Transition>
        </div>

        <div class="options-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="info-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p>La taxe de séjour (0,80 €/nuit/adulte) est automatiquement incluse.</p>
        </div>
      </div>

      <!-- Etape 5 : Tarif -->
      <div v-if="currentStep === 5" class="step-panel">
        <h2 class="step-title">Tarif de la location</h2>
        <p class="step-description">Ajustez le prix si nécessaire</p>

        <!-- Indicateur de chargement -->
        <div v-if="formStore.isCalculatingPrice" class="price-loading">
          <svg
            class="loading-spinner"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>Calcul du tarif en cours...</span>
        </div>

        <!-- Erreur de calcul -->
        <div v-if="formStore.priceCalculationError" class="price-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="warning-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{{ formStore.priceCalculationError }} - Tarif de secours appliqué</span>
        </div>

        <!-- Jours non couverts -->
        <div v-if="formStore.hasUncoveredDays" class="price-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="warning-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span
            >{{ formStore.uncoveredDays }} jour(s) non couverts par la grille tarifaire (tarif par
            défaut appliqué)</span
          >
        </div>

        <!-- Indicateur tarif hebdo -->
        <div v-if="formStore.weeklyRateLabel" class="weekly-rate-badge">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="badge-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{{ formStore.weeklyRateLabel }}</span>
        </div>

        <!-- Detail par saison -->
        <div v-if="formStore.priceDetails.length > 0" class="price-details">
          <h3 class="details-title">Détail du calcul</h3>
          <div v-for="(detail, index) in formStore.priceDetails" :key="index" class="detail-line">
            <div class="detail-period">
              <span class="detail-season">{{ detail.seasonName }}</span>
              <span class="detail-dates"
                >{{ detail.nights }} nuit{{ detail.nights > 1 ? 's' : '' }} x
                {{ formatPrice(detail.pricePerNight) }}</span
              >
            </div>
            <span class="detail-subtotal">{{ formatPrice(detail.subtotal) }}</span>
          </div>
        </div>

        <div v-else class="price-suggestion">
          <div class="suggestion-header">
            <span class="suggestion-label">Prix suggéré</span>
            <span class="suggestion-value">{{ formatPrice(formStore.pricePerNight) }}/nuit</span>
          </div>
          <p class="suggestion-note">Basé sur la période ({{ formStore.nightsCount }} nuits)</p>
        </div>

        <div class="form-group">
          <label for="rentalPrice" class="form-label">Prix total de la location</label>
          <div class="price-input-wrapper">
            <input
              id="rentalPrice"
              v-model.number="formStore.rentalPrice"
              type="number"
              class="form-input form-input--price"
              min="0"
              step="10"
            />
            <span class="price-suffix">€</span>
          </div>
        </div>

        <div class="price-breakdown">
          <h3 class="breakdown-title">Récapitulatif des coûts</h3>
          <div class="breakdown-line">
            <span>Location ({{ formStore.nightsCount }} nuits)</span>
            <span>{{ formatPrice(formStore.rentalPrice) }}</span>
          </div>
          <div v-if="formStore.cleaningIncluded" class="breakdown-line">
            <span>Ménage</span>
            <span v-if="formStore.cleaningOffered" class="breakdown-offered">Offert</span>
            <span v-else>{{ formatPrice(formStore.cleaningPrice) }}</span>
          </div>
          <div v-if="formStore.linenIncluded" class="breakdown-line">
            <span>Linge ({{ formStore.occupantsCount }} pers.)</span>
            <span v-if="formStore.linenOffered" class="breakdown-offered">Offert</span>
            <span v-else>{{ formatPrice(formStore.linenPrice) }}</span>
          </div>
          <div class="breakdown-line">
            <span>Taxe de séjour</span>
            <span>{{ formatPrice(formStore.touristTaxPrice) }}</span>
          </div>
          <div class="breakdown-line breakdown-line--total">
            <span>Total</span>
            <span>{{ formatPrice(formStore.totalPrice) }}</span>
          </div>
        </div>
      </div>

      <!-- Etape 6 : Recapitulatif -->
      <div v-if="currentStep === 6" class="step-panel">
        <h2 class="step-title">Vérifiez les informations</h2>
        <p class="step-description">Confirmez pour créer la réservation</p>

        <div class="recap-section">
          <h3 class="recap-title">Dates du séjour</h3>
          <div class="recap-content">
            <p><strong>Arrivée :</strong> {{ formatDateLong(formStore.startDate) }}</p>
            <p><strong>Départ :</strong> {{ formatDateLong(formStore.endDate) }}</p>
            <p><strong>Durée :</strong> {{ formStore.nightsCount }} nuits</p>
          </div>
        </div>

        <div class="recap-section">
          <h3 class="recap-title">Client</h3>
          <div class="recap-content">
            <p><strong>Nom :</strong> {{ formStore.clientFullName }}</p>
            <p>
              <strong>Adresse :</strong> {{ formStore.primaryClient.address }},
              {{ formStore.primaryClient.postalCode }} {{ formStore.primaryClient.city }},
              {{ formStore.primaryClient.country }}
            </p>
            <p><strong>Téléphone :</strong> {{ formStore.primaryClient.phone }}</p>
            <p><strong>Email :</strong> {{ formStore.primaryClient.email }}</p>
          </div>
        </div>

        <div class="recap-section">
          <h3 class="recap-title">Occupants</h3>
          <div class="recap-content">
            <p>
              {{ formStore.occupantsCount }} personne{{
                formStore.occupantsCount > 1 ? 's' : ''
              }}
              dont {{ formStore.adultsCount }} adulte{{ formStore.adultsCount > 1 ? 's' : '' }}
            </p>
          </div>
        </div>

        <div class="recap-section">
          <h3 class="recap-title">Options</h3>
          <div class="recap-content">
            <p v-if="formStore.cleaningIncluded">
              Ménage fin de séjour :
              <template v-if="formStore.cleaningOffered">Offert</template>
              <template v-else>80 €</template>
            </p>
            <p v-if="formStore.linenIncluded">
              Linge de maison :
              <template v-if="formStore.linenOffered">Offert</template>
              <template v-else>{{ formatPrice(formStore.linenPrice) }}</template>
            </p>
            <p v-if="!formStore.cleaningIncluded && !formStore.linenIncluded">Aucune option</p>
          </div>
        </div>

        <div class="recap-section recap-section--highlight">
          <h3 class="recap-title">Montants</h3>
          <div class="recap-content">
            <div class="recap-price-line">
              <span>Total à payer</span>
              <span class="recap-total">{{ formatPrice(formStore.totalPrice) }}</span>
            </div>
            <div class="recap-price-line">
              <span>Acompte (30%)</span>
              <span>{{ formatPrice(formStore.depositAmount) }}</span>
            </div>
            <div class="recap-price-line">
              <span>Solde (15j avant)</span>
              <span>{{ formatPrice(formStore.balanceAmount) }}</span>
            </div>
            <p class="recap-deposit">+ Dépôt de garantie : 500 € (chèque non encaissé)</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-navigation">
      <button v-if="currentStep > 1" class="nav-btn nav-btn--prev" @click="handlePrev">
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
        Précédent
      </button>
      <button v-else class="nav-btn nav-btn--reset" @click="handleReset">Recommencer</button>

      <button
        v-if="currentStep < 6"
        class="nav-btn nav-btn--next"
        :disabled="currentStep === 2 ? false : !formStore.canProceed"
        @click="handleNext"
      >
        Suivant
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
      <button v-else class="nav-btn nav-btn--submit" :disabled="loading" @click="handleSubmit">
        <svg
          v-if="loading"
          xmlns="http://www.w3.org/2000/svg"
          class="loading-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
        <template v-else>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Créer la réservation
        </template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.new-booking-view {
  max-width: 500px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Toast de succes */
.success-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background-color: #10b981;
  color: white;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.toast-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

/* Barre de progression */
.progress-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 8px;
  overflow-x: auto;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  background-color: #e5e5e5;
  color: #717171;
  transition: all 0.2s;
}

.progress-step--active .step-circle {
  background-color: #ff385c;
  color: white;
}

.progress-step--completed .step-circle {
  background-color: #10b981;
  color: white;
}

.check-icon {
  width: 16px;
  height: 16px;
}

.step-label {
  font-size: 11px;
  color: #717171;
  text-align: center;
  max-width: 60px;
}

.progress-step--active .step-label {
  color: #ff385c;
  font-weight: 600;
}

.progress-step--completed .step-label {
  color: #10b981;
}

/* Banniere d'erreur */
.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  margin-bottom: 20px;
}

.error-icon {
  width: 24px;
  height: 24px;
  color: #ef4444;
  flex-shrink: 0;
}

.error-banner span {
  flex: 1;
  font-size: 15px;
  color: #dc2626;
}

.error-close {
  padding: 8px 14px;
  background-color: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* Contenu des etapes */
.step-content {
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
  margin-bottom: 20px;
}

.step-panel {
  min-height: 300px;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 8px 0;
}

.step-description {
  font-size: 15px;
  color: #717171;
  margin: 0 0 24px 0;
}

/* Formulaires */
.form-group {
  margin-bottom: 20px;
}

.form-group--small {
  flex: 0 0 120px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
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
}

.form-input:focus {
  outline: none;
  border-color: #ff385c;
}

.form-input:disabled {
  background-color: #f7f7f7;
  color: #a3a3a3;
}

.form-input--price {
  padding-right: 50px;
}

.price-input-wrapper {
  position: relative;
}

.price-suffix {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #717171;
  font-weight: 500;
}

.form-input--error {
  border-color: #ef4444 !important;
}

.form-input--error:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-field-error {
  font-size: 14px;
  color: #dc2626;
  margin-top: 6px;
  margin-bottom: 0;
}

.form-required {
  color: #ef4444;
  margin-left: 2px;
}

.form-error {
  font-size: 14px;
  color: #dc2626;
  margin-top: 8px;
}

.form-hint {
  font-size: 13px;
  color: #717171;
  margin-top: 8px;
}

.form-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: #484848;
  margin: 0 0 16px 0;
}

.form-divider {
  height: 1px;
  background-color: #e5e5e5;
  margin: 20px 0;
}

/* Resume dates */
.date-summary {
  background-color: #f7f7f7;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 14px;
  color: #717171;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #222222;
}

/* Toggle client secondaire */
.secondary-toggle {
  margin-top: 20px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle-input {
  width: 20px;
  height: 20px;
  accent-color: #ff385c;
}

.toggle-text {
  font-size: 15px;
  color: #484848;
}

/* Compteur */
.counter-input {
  display: flex;
  align-items: center;
  gap: 16px;
}

.counter-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #e5e5e5;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.counter-btn:hover:not(:disabled) {
  border-color: #ff385c;
  background-color: #fff0f3;
}

.counter-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.counter-btn svg {
  width: 20px;
  height: 20px;
  color: #484848;
}

.counter-value {
  font-size: 24px;
  font-weight: 700;
  color: #222222;
  min-width: 40px;
  text-align: center;
}

/* Options */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: #d4d4d4;
}

.option-card--selected {
  border-color: #ff385c;
  background-color: #fff8f9;
}

.option-card--offered {
  border-color: #10b981;
  background-color: #ecfdf5;
}

.option-badge-offered {
  font-size: 13px;
  font-weight: 700;
  color: #10b981;
  background-color: #d1fae5;
  padding: 2px 8px;
  border-radius: 12px;
}

.option-input {
  display: none;
}

.option-content {
  flex: 1;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.option-name {
  font-size: 15px;
  font-weight: 600;
  color: #222222;
}

.option-price {
  font-size: 14px;
  font-weight: 600;
  color: #ff385c;
}

.option-description {
  font-size: 13px;
  color: #717171;
  margin: 0;
}

.option-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.option-card--selected .option-check {
  border-color: #ff385c;
  background-color: #ff385c;
}

.option-check svg {
  width: 14px;
  height: 14px;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
}

.option-card--selected .option-check svg {
  opacity: 1;
}

.option-card--offered .option-check {
  border-color: #10b981;
  background-color: #10b981;
}

/* Toggle Offrir */
.offer-toggle {
  margin-top: -4px;
  margin-bottom: 12px;
  padding: 10px 16px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-top: none;
  border-radius: 0 0 12px 12px;
}

.offer-toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.offer-toggle-input {
  width: 18px;
  height: 18px;
  accent-color: #10b981;
}

.offer-toggle-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #059669;
  font-weight: 500;
}

.gift-icon {
  width: 16px;
  height: 16px;
}

.breakdown-offered {
  color: #10b981;
  font-weight: 600;
}

.options-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 20px;
  padding: 12px;
  background-color: #f0f9ff;
  border-radius: 8px;
}

.options-info .info-icon {
  width: 18px;
  height: 18px;
  color: #0284c7;
  flex-shrink: 0;
}

.options-info p {
  font-size: 13px;
  color: #0369a1;
  margin: 0;
}

/* Chargement du prix */
.price-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background-color: #f3f4f6;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #6b7280;
  font-size: 15px;
}

.price-loading .loading-spinner {
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

/* Avertissement prix */
.price-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #92400e;
}

.price-warning .warning-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #d97706;
}

/* Badge tarif hebdo */
.weekly-rate-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background-color: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #1e40af;
}

.weekly-rate-badge .badge-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #2563eb;
}

/* Detail par saison */
.price-details {
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.details-title {
  font-size: 14px;
  font-weight: 600;
  color: #065f46;
  margin: 0 0 12px 0;
}

.detail-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #a7f3d0;
}

.detail-line:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-period {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-season {
  font-size: 15px;
  font-weight: 600;
  color: #047857;
}

.detail-dates {
  font-size: 13px;
  color: #059669;
}

.detail-subtotal {
  font-size: 15px;
  font-weight: 600;
  color: #065f46;
}

/* Prix suggere */
.price-suggestion {
  background-color: #fff8e6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestion-label {
  font-size: 14px;
  color: #92400e;
}

.suggestion-value {
  font-size: 18px;
  font-weight: 700;
  color: #78350f;
}

.suggestion-note {
  font-size: 13px;
  color: #a16207;
  margin: 8px 0 0 0;
}

/* Decomposition prix */
.price-breakdown {
  background-color: #f7f7f7;
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
}

.breakdown-title {
  font-size: 14px;
  font-weight: 600;
  color: #484848;
  margin: 0 0 12px 0;
}

.breakdown-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #484848;
  border-bottom: 1px solid #e5e5e5;
}

.breakdown-line:last-child {
  border-bottom: none;
}

.breakdown-line--total {
  border-top: 2px solid #222222;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #222222;
}

/* Recapitulatif */
.recap-section {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.recap-section--highlight {
  background-color: #fff0f3;
}

.recap-title {
  font-size: 14px;
  font-weight: 600;
  color: #ff385c;
  margin: 0 0 12px 0;
}

.recap-content {
  font-size: 14px;
  color: #484848;
  line-height: 1.6;
}

.recap-content p {
  margin: 0 0 6px 0;
}

.recap-content p:last-child {
  margin-bottom: 0;
}

.recap-price-line {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.recap-total {
  font-size: 18px;
  font-weight: 700;
  color: #ff385c;
}

.recap-deposit {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #fecdd3;
  font-size: 13px;
  color: #be123c;
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
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn svg {
  width: 20px;
  height: 20px;
}

.nav-btn--prev,
.nav-btn--reset {
  background-color: #f3f4f6;
  color: #484848;
}

.nav-btn--prev:hover:not(:disabled),
.nav-btn--reset:hover:not(:disabled) {
  background-color: #e5e5e5;
}

.nav-btn--next {
  background-color: #ff385c;
  color: white;
}

.nav-btn--next:hover:not(:disabled) {
  background-color: #e31c5f;
}

.nav-btn--submit {
  background-color: #10b981;
  color: white;
}

.nav-btn--submit:hover:not(:disabled) {
  background-color: #059669;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (min-width: 768px) {
  .success-toast {
    top: 32px;
  }

  .new-booking-view {
    max-width: 600px;
  }

  .progress-bar {
    padding: 0;
    background-color: white;
    border-radius: 12px;
    padding: 16px 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e5e5;
    margin-bottom: 24px;
  }

  .progress-step {
    position: relative;
  }

  /* Ligne de connexion entre les étapes */
  .progress-step::after {
    content: '';
    position: absolute;
    top: 16px;
    left: calc(50% + 20px);
    width: calc(100% - 40px);
    height: 2px;
    background-color: #e5e5e5;
  }

  .progress-step:last-child::after {
    display: none;
  }

  .progress-step--completed::after {
    background-color: #10b981;
  }

  .step-circle {
    width: 36px;
    height: 36px;
    font-size: 15px;
    position: relative;
    z-index: 1;
  }

  .step-label {
    font-size: 12px;
    max-width: 80px;
  }
}

/* Desktop: Large */
@media (min-width: 1024px) {
  .new-booking-view {
    max-width: 700px;
  }

  .step-content {
    padding: 32px;
  }

  .step-panel {
    min-height: 350px;
  }

  .step-title {
    font-size: 24px;
  }

  .step-circle {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .step-label {
    font-size: 13px;
  }
}

/* Desktop: Extra large */
@media (min-width: 1200px) {
  .new-booking-view {
    max-width: 800px;
  }
}
</style>
