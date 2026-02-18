<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import DatePicker from './DatePicker.vue';
import {
  bookingsApi,
  pricingApi,
  type Booking,
  type UpdateBookingData,
  type PriceCalculation,
} from '../../lib/api';
import { OPTION_PRICES, BOOKING_CONSTRAINTS } from '../../constants/pricing';
import {
  required,
  email as emailRule,
  postalCode as postalCodeRule,
  phone as phoneRule,
} from '../../utils/validation';
import { useFormValidation } from '../../composables/useFormValidation';
import { COUNTRIES } from '../../constants/property';

interface Props {
  booking: Booking;
  bookedDates?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  bookedDates: () => [],
});

const emit = defineEmits<{
  close: [];
  updated: [booking: Booking];
}>();

const submitting = ref(false);
const errorMessage = ref<string | null>(null);
const priceCalculation = ref<PriceCalculation | null>(null);
const loadingPrice = ref(false);

// Sections en mode edition
const editingSection = ref<string | null>(null);

// Formulaire
const form = ref({
  startDate: props.booking.startDate.split('T')[0],
  endDate: props.booking.endDate.split('T')[0],
  primaryClient: props.booking.primaryClient
    ? {
        firstName: props.booking.primaryClient.firstName,
        lastName: props.booking.primaryClient.lastName,
        email: props.booking.primaryClient.email || '',
        address: props.booking.primaryClient.address,
        city: props.booking.primaryClient.city,
        postalCode: props.booking.primaryClient.postalCode,
        country: props.booking.primaryClient.country || 'France',
        phone: props.booking.primaryClient.phone,
      }
    : null,
  secondaryClient: props.booking.secondaryClient
    ? {
        firstName: props.booking.secondaryClient.firstName,
        lastName: props.booking.secondaryClient.lastName,
        email: props.booking.secondaryClient.email || '',
        address: props.booking.secondaryClient.address,
        city: props.booking.secondaryClient.city,
        postalCode: props.booking.secondaryClient.postalCode,
        country: props.booking.secondaryClient.country || 'France',
        phone: props.booking.secondaryClient.phone,
      }
    : null,
  occupantsCount: props.booking.occupantsCount,
  adultsCount: props.booking.adultsCount,
  rentalPrice: parseFloat(String(props.booking.rentalPrice)),
  touristTaxIncluded: props.booking.touristTaxIncluded,
  cleaningIncluded: props.booking.cleaningIncluded,
  cleaningOffered: props.booking.cleaningOffered,
  linenIncluded: props.booking.linenIncluded,
  linenOffered: props.booking.linenOffered,
  manualPrice: true,
});

const clientValidation = useFormValidation({
  schema: {
    firstName: [required('Le prénom est obligatoire')],
    lastName: [required('Le nom est obligatoire')],
    address: [required("L'adresse est obligatoire")],
    postalCode: [required('Le code postal est obligatoire'), postalCodeRule()],
    city: [required('La ville est obligatoire')],
    phone: [required('Le téléphone est obligatoire'), phoneRule()],
    email: [emailRule()],
  },
  formData: () =>
    form.value.primaryClient ?? {
      firstName: '',
      lastName: '',
      address: '',
      postalCode: '',
      city: '',
      country: 'France',
      phone: '',
      email: '',
    },
});

// Backup pour annuler l'edition d'une section
const sectionBackup = ref<Record<string, unknown>>({});

const nightsCount = computed((): number => {
  if (!form.value.startDate || !form.value.endDate) return 0;
  const start = new Date(form.value.startDate);
  const end = new Date(form.value.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const cleaningPrice = computed((): number => {
  if (!form.value.cleaningIncluded || form.value.cleaningOffered) return 0;
  return OPTION_PRICES.CLEANING;
});

const linenPrice = computed((): number => {
  if (!form.value.linenIncluded || form.value.linenOffered) return 0;
  return OPTION_PRICES.LINEN_PER_PERSON * form.value.occupantsCount;
});

const touristTaxPrice = computed((): number => {
  if (!form.value.touristTaxIncluded) return 0;
  return OPTION_PRICES.TOURIST_TAX_PER_ADULT_PER_NIGHT * form.value.adultsCount * nightsCount.value;
});

const totalPrice = computed((): number => {
  return form.value.rentalPrice + cleaningPrice.value + linenPrice.value + touristTaxPrice.value;
});

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(price);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const hasChanges = computed((): boolean => {
  const original = props.booking;
  const originalStart = original.startDate.split('T')[0];
  const originalEnd = original.endDate.split('T')[0];
  const originalRentalPrice = parseFloat(String(original.rentalPrice));

  return (
    form.value.startDate !== originalStart ||
    form.value.endDate !== originalEnd ||
    form.value.occupantsCount !== original.occupantsCount ||
    form.value.adultsCount !== original.adultsCount ||
    form.value.rentalPrice !== originalRentalPrice ||
    form.value.touristTaxIncluded !== original.touristTaxIncluded ||
    form.value.cleaningIncluded !== original.cleaningIncluded ||
    form.value.cleaningOffered !== original.cleaningOffered ||
    form.value.linenIncluded !== original.linenIncluded ||
    form.value.linenOffered !== original.linenOffered ||
    hasClientChanged('primary') ||
    hasClientChanged('secondary')
  );
});

const hasClientChanged = (type: 'primary' | 'secondary'): boolean => {
  const originalClient =
    type === 'primary' ? props.booking.primaryClient : props.booking.secondaryClient;
  const formClient = type === 'primary' ? form.value.primaryClient : form.value.secondaryClient;

  if (!originalClient && !formClient) return false;
  if (!originalClient || !formClient) return true;

  return (
    formClient.firstName !== originalClient.firstName ||
    formClient.lastName !== originalClient.lastName ||
    formClient.email !== (originalClient.email || '') ||
    formClient.address !== originalClient.address ||
    formClient.city !== originalClient.city ||
    formClient.postalCode !== originalClient.postalCode ||
    formClient.phone !== originalClient.phone
  );
};

// Dates deja reservees (exclure la reservation en cours)
const filteredBookedDates = computed((): string[] => {
  const bookingStart = new Date(props.booking.startDate);
  const bookingEnd = new Date(props.booking.endDate);
  const bookingDates = new Set<string>();

  const current = new Date(bookingStart);
  while (current <= bookingEnd) {
    bookingDates.add(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return props.bookedDates.filter((date) => !bookingDates.has(date));
});

const startEditing = (section: string): void => {
  // Sauvegarder les valeurs actuelles pour pouvoir annuler
  if (section === 'dates') {
    sectionBackup.value = { startDate: form.value.startDate, endDate: form.value.endDate };
  } else if (section === 'client') {
    sectionBackup.value = {
      primaryClient: form.value.primaryClient ? { ...form.value.primaryClient } : null,
    };
  } else if (section === 'occupants') {
    sectionBackup.value = {
      occupantsCount: form.value.occupantsCount,
      adultsCount: form.value.adultsCount,
    };
  } else if (section === 'options') {
    sectionBackup.value = {
      touristTaxIncluded: form.value.touristTaxIncluded,
      cleaningIncluded: form.value.cleaningIncluded,
      cleaningOffered: form.value.cleaningOffered,
      linenIncluded: form.value.linenIncluded,
      linenOffered: form.value.linenOffered,
    };
  } else if (section === 'price') {
    sectionBackup.value = {
      rentalPrice: form.value.rentalPrice,
      manualPrice: form.value.manualPrice,
    };
  }
  editingSection.value = section;
};

const cancelEditing = (): void => {
  if (editingSection.value && sectionBackup.value) {
    Object.assign(form.value, sectionBackup.value);
  }
  clientValidation.resetTouched();
  editingSection.value = null;
};

const confirmSection = (): void => {
  editingSection.value = null;
};

// Recalculer le prix quand les dates changent
const handleRecalculatePrice = async (): Promise<void> => {
  if (!form.value.startDate || !form.value.endDate) return;

  try {
    loadingPrice.value = true;
    errorMessage.value = null;
    const result = await pricingApi.calculate(form.value.startDate, form.value.endDate);
    priceCalculation.value = result;
    form.value.rentalPrice = result.totalPrice;
    form.value.manualPrice = false;
  } catch (err: unknown) {
    console.error('Erreur lors du recalcul du prix:', err);
    errorMessage.value = 'Impossible de recalculer le prix.';
  } finally {
    loadingPrice.value = false;
  }
};

// Surveiller les changements de dates pour proposer le recalcul
const datesChanged = computed((): boolean => {
  const originalStart = props.booking.startDate.split('T')[0];
  const originalEnd = props.booking.endDate.split('T')[0];
  return form.value.startDate !== originalStart || form.value.endDate !== originalEnd;
});

watch(datesChanged, (changed) => {
  if (changed) {
    void handleRecalculatePrice();
  }
});

// Reinitialiser offered quand l'option est decochee
watch(
  () => form.value.cleaningIncluded,
  (included) => {
    if (!included) form.value.cleaningOffered = false;
  }
);

watch(
  () => form.value.linenIncluded,
  (included) => {
    if (!included) form.value.linenOffered = false;
  }
);

// Ajuster adultsCount si occupantsCount diminue
watch(
  () => form.value.occupantsCount,
  (newCount) => {
    if (form.value.adultsCount > newCount) {
      form.value.adultsCount = newCount;
    }
  }
);

const validateForm = (): string | null => {
  if (!form.value.startDate || !form.value.endDate) {
    return 'Les dates de debut et de fin sont obligatoires.';
  }

  const start = new Date(form.value.startDate);
  const end = new Date(form.value.endDate);
  if (start >= end) {
    return "La date de depart doit etre posterieure a la date d'arrivee.";
  }

  if (nightsCount.value < BOOKING_CONSTRAINTS.MIN_NIGHTS) {
    return `Le sejour doit comporter au minimum ${String(BOOKING_CONSTRAINTS.MIN_NIGHTS)} nuits.`;
  }

  if (form.value.primaryClient) {
    if (!clientValidation.attemptSubmit()) {
      return 'Veuillez corriger les erreurs du client principal.';
    }
  }

  if (
    form.value.occupantsCount < 1 ||
    form.value.occupantsCount > BOOKING_CONSTRAINTS.MAX_OCCUPANTS
  ) {
    return `Le nombre d'occupants doit etre entre 1 et ${String(BOOKING_CONSTRAINTS.MAX_OCCUPANTS)}.`;
  }

  if (form.value.adultsCount < 1 || form.value.adultsCount > form.value.occupantsCount) {
    return "Le nombre d'adultes doit etre entre 1 et le nombre total d'occupants.";
  }

  if (form.value.rentalPrice < 0) {
    return 'Le prix de location ne peut pas etre negatif.';
  }

  return null;
};

const handleSubmit = async (): Promise<void> => {
  try {
    submitting.value = true;
    errorMessage.value = null;

    const validationError = validateForm();
    if (validationError) {
      errorMessage.value = validationError;
      submitting.value = false;
      return;
    }

    const updateData: UpdateBookingData = {};
    const original = props.booking;
    const originalStart = original.startDate.split('T')[0];
    const originalEnd = original.endDate.split('T')[0];

    if (form.value.startDate !== originalStart) updateData.startDate = form.value.startDate;
    if (form.value.endDate !== originalEnd) updateData.endDate = form.value.endDate;
    if (form.value.occupantsCount !== original.occupantsCount)
      updateData.occupantsCount = form.value.occupantsCount;
    if (form.value.adultsCount !== original.adultsCount)
      updateData.adultsCount = form.value.adultsCount;
    if (form.value.rentalPrice !== parseFloat(String(original.rentalPrice)))
      updateData.rentalPrice = form.value.rentalPrice;
    if (form.value.touristTaxIncluded !== original.touristTaxIncluded)
      updateData.touristTaxIncluded = form.value.touristTaxIncluded;
    if (form.value.cleaningIncluded !== original.cleaningIncluded)
      updateData.cleaningIncluded = form.value.cleaningIncluded;
    if (form.value.cleaningOffered !== original.cleaningOffered)
      updateData.cleaningOffered = form.value.cleaningOffered;
    if (form.value.linenIncluded !== original.linenIncluded)
      updateData.linenIncluded = form.value.linenIncluded;
    if (form.value.linenOffered !== original.linenOffered)
      updateData.linenOffered = form.value.linenOffered;

    if (hasClientChanged('primary') && form.value.primaryClient) {
      updateData.primaryClient = form.value.primaryClient;
    }
    if (hasClientChanged('secondary') && form.value.secondaryClient) {
      updateData.secondaryClient = form.value.secondaryClient;
    }

    const updated = await bookingsApi.update(props.booking.id, updateData);
    emit('updated', updated);
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string } } };
    errorMessage.value =
      error.response?.data?.message ?? 'Impossible de modifier la reservation. Veuillez reessayer.';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <BaseModal
    title="Modifier la reservation"
    :submitting="submitting"
    max-width="560px"
    @close="emit('close')"
  >
    <!-- Erreur -->
    <div v-if="errorMessage" class="edit-error">
      <span>{{ errorMessage }}</span>
      <button class="edit-error-close" @click="errorMessage = null">Fermer</button>
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
        <span>Du {{ formatDate(form.startDate) }} au {{ formatDate(form.endDate) }}</span>
        <span class="edit-section-detail"
          >{{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}</span
        >
      </div>
      <div v-else class="edit-section-form">
        <div class="date-fields">
          <DatePicker
            v-model="form.startDate"
            label="Date d'arrivee"
            :disabled-dates="filteredBookedDates"
          />
          <DatePicker
            v-model="form.endDate"
            label="Date de depart"
            :min-date="form.startDate"
            :disabled-dates="filteredBookedDates"
          />
        </div>
        <p v-if="nightsCount > 0" class="date-nights-info">
          {{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}
          <span v-if="nightsCount < BOOKING_CONSTRAINTS.MIN_NIGHTS" class="date-warning">
            (minimum {{ BOOKING_CONSTRAINTS.MIN_NIGHTS }} nuits)
          </span>
        </p>
      </div>
    </div>

    <!-- Section Client principal -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'client' }">
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
          <span>CLIENT PRINCIPAL</span>
        </div>
        <button v-if="editingSection !== 'client'" class="edit-btn" @click="startEditing('client')">
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'client'" class="edit-section-summary">
        <template v-if="form.primaryClient">
          <span class="client-summary-name"
            >{{ form.primaryClient.firstName }} {{ form.primaryClient.lastName }}</span
          >
          <span class="edit-section-detail"
            >{{ form.primaryClient.address }}, {{ form.primaryClient.postalCode }}
            {{ form.primaryClient.city }}, {{ form.primaryClient.country }}</span
          >
          <span class="edit-section-detail">{{ form.primaryClient.phone }}</span>
          <span v-if="form.primaryClient.email" class="edit-section-detail">{{
            form.primaryClient.email
          }}</span>
        </template>
        <span v-else class="edit-section-detail">Non renseigne</span>
      </div>
      <div v-else class="edit-section-form">
        <template v-if="form.primaryClient">
          <div class="form-row">
            <div class="form-field">
              <label class="form-label">Prenom</label>
              <input
                v-model="form.primaryClient.firstName"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': clientValidation.hasFieldError('firstName') }"
                @blur="clientValidation.touchField('firstName')"
              />
              <p v-if="clientValidation.fieldError('firstName')" class="form-field-error">
                {{ clientValidation.fieldError('firstName') }}
              </p>
            </div>
            <div class="form-field">
              <label class="form-label">Nom</label>
              <input
                v-model="form.primaryClient.lastName"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': clientValidation.hasFieldError('lastName') }"
                @blur="clientValidation.touchField('lastName')"
              />
              <p v-if="clientValidation.fieldError('lastName')" class="form-field-error">
                {{ clientValidation.fieldError('lastName') }}
              </p>
            </div>
          </div>
          <div class="form-field">
            <label class="form-label">Adresse</label>
            <input
              v-model="form.primaryClient.address"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': clientValidation.hasFieldError('address') }"
              @blur="clientValidation.touchField('address')"
            />
            <p v-if="clientValidation.fieldError('address')" class="form-field-error">
              {{ clientValidation.fieldError('address') }}
            </p>
          </div>
          <div class="form-field">
            <label class="form-label">Pays</label>
            <select v-model="form.primaryClient.country" class="form-input">
              <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label class="form-label">Code postal</label>
              <input
                v-model="form.primaryClient.postalCode"
                type="text"
                class="form-input"
                maxlength="10"
                :class="{ 'form-input--error': clientValidation.hasFieldError('postalCode') }"
                @blur="clientValidation.touchField('postalCode')"
              />
              <p v-if="clientValidation.fieldError('postalCode')" class="form-field-error">
                {{ clientValidation.fieldError('postalCode') }}
              </p>
            </div>
            <div class="form-field">
              <label class="form-label">Ville</label>
              <input
                v-model="form.primaryClient.city"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': clientValidation.hasFieldError('city') }"
                @blur="clientValidation.touchField('city')"
              />
              <p v-if="clientValidation.fieldError('city')" class="form-field-error">
                {{ clientValidation.fieldError('city') }}
              </p>
            </div>
          </div>
          <div class="form-field">
            <label class="form-label">Telephone</label>
            <input
              v-model="form.primaryClient.phone"
              type="tel"
              class="form-input"
              :class="{ 'form-input--error': clientValidation.hasFieldError('phone') }"
              @blur="clientValidation.touchField('phone')"
            />
            <p v-if="clientValidation.fieldError('phone')" class="form-field-error">
              {{ clientValidation.fieldError('phone') }}
            </p>
          </div>
          <div class="form-field">
            <label class="form-label" for="edit-client-email">Email (optionnel)</label>
            <input
              id="edit-client-email"
              v-model="form.primaryClient.email"
              type="email"
              class="form-input"
              :class="{ 'form-input--error': clientValidation.hasFieldError('email') }"
              placeholder="email@exemple.com"
              aria-label="Email du client principal"
              @blur="clientValidation.touchField('email')"
            />
            <p v-if="clientValidation.fieldError('email')" class="form-field-error">
              {{ clientValidation.fieldError('email') }}
            </p>
          </div>
        </template>
      </div>
    </div>

    <!-- Section Occupants -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'occupants' }">
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>OCCUPANTS</span>
        </div>
        <button
          v-if="editingSection !== 'occupants'"
          class="edit-btn"
          @click="startEditing('occupants')"
        >
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'occupants'" class="edit-section-summary">
        <span>{{ form.occupantsCount }} personne{{ form.occupantsCount > 1 ? 's' : '' }}</span>
        <span class="edit-section-detail"
          >dont {{ form.adultsCount }} adulte{{ form.adultsCount > 1 ? 's' : '' }}</span
        >
      </div>
      <div v-else class="edit-section-form">
        <div class="counter-control">
          <button
            class="counter-btn"
            :disabled="form.occupantsCount <= 1"
            @click="form.occupantsCount = Math.max(1, form.occupantsCount - 1)"
          >
            -
          </button>
          <span class="counter-value">{{ form.occupantsCount }}</span>
          <button
            class="counter-btn"
            :disabled="form.occupantsCount >= BOOKING_CONSTRAINTS.MAX_OCCUPANTS"
            @click="
              form.occupantsCount = Math.min(
                BOOKING_CONSTRAINTS.MAX_OCCUPANTS,
                form.occupantsCount + 1
              )
            "
          >
            +
          </button>
        </div>
        <p class="counter-hint">Maximum {{ BOOKING_CONSTRAINTS.MAX_OCCUPANTS }} personnes</p>
        <p class="counter-section-label">Dont adultes (pour la taxe de sejour)</p>
        <div class="counter-control">
          <button
            class="counter-btn"
            :disabled="form.adultsCount <= 1"
            @click="form.adultsCount = Math.max(1, form.adultsCount - 1)"
          >
            -
          </button>
          <span class="counter-value">{{ form.adultsCount }}</span>
          <button
            class="counter-btn"
            :disabled="form.adultsCount >= form.occupantsCount"
            @click="form.adultsCount = Math.min(form.occupantsCount, form.adultsCount + 1)"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <!-- Section Options -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'options' }">
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
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>OPTIONS</span>
        </div>
        <button
          v-if="editingSection !== 'options'"
          class="edit-btn"
          @click="startEditing('options')"
        >
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'options'" class="edit-section-summary">
        <div class="options-list">
          <span class="option-item" :class="{ 'option-item--active': form.cleaningIncluded }">
            {{ form.cleaningIncluded ? 'Menage' : 'Menage non inclus' }}
            <template v-if="form.cleaningIncluded">
              ({{
                form.cleaningOffered ? 'Offert' : formatPrice(OPTION_PRICES.CLEANING)
              }})</template
            >
          </span>
          <span class="option-item" :class="{ 'option-item--active': form.linenIncluded }">
            {{ form.linenIncluded ? 'Linge' : 'Linge non inclus' }}
            <template v-if="form.linenIncluded">
              ({{ form.linenOffered ? 'Offert' : formatPrice(linenPrice) }})</template
            >
          </span>
          <span class="option-item" :class="{ 'option-item--active': form.touristTaxIncluded }">
            {{ form.touristTaxIncluded ? 'Taxe de sejour' : 'Taxe non incluse' }}
            <template v-if="form.touristTaxIncluded">
              ({{ formatPrice(touristTaxPrice) }})</template
            >
          </span>
        </div>
      </div>
      <div v-else class="edit-section-form">
        <label class="toggle-option">
          <input v-model="form.cleaningIncluded" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">
            <span class="toggle-name">Menage fin de sejour</span>
            <span class="toggle-price">{{ formatPrice(OPTION_PRICES.CLEANING) }}</span>
          </span>
        </label>
        <div v-if="form.cleaningIncluded" class="offer-inline-toggle">
          <label class="offer-inline-label">
            <input v-model="form.cleaningOffered" type="checkbox" class="offer-inline-checkbox" />
            <span>Offrir cette option</span>
          </label>
        </div>
        <label class="toggle-option">
          <input v-model="form.linenIncluded" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">
            <span class="toggle-name">Linge de maison</span>
            <span class="toggle-price">{{ OPTION_PRICES.LINEN_PER_PERSON }} €/personne</span>
          </span>
        </label>
        <div v-if="form.linenIncluded" class="offer-inline-toggle">
          <label class="offer-inline-label">
            <input v-model="form.linenOffered" type="checkbox" class="offer-inline-checkbox" />
            <span>Offrir cette option</span>
          </label>
        </div>
        <label class="toggle-option">
          <input v-model="form.touristTaxIncluded" type="checkbox" class="toggle-checkbox" />
          <span class="toggle-label">
            <span class="toggle-name">Taxe de sejour</span>
            <span class="toggle-price"
              >{{ OPTION_PRICES.TOURIST_TAX_PER_ADULT_PER_NIGHT }} €/pers/nuit</span
            >
          </span>
        </label>
      </div>
    </div>

    <!-- Section Tarif -->
    <div class="edit-section" :class="{ 'edit-section--editing': editingSection === 'price' }">
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
          <span>TARIF</span>
        </div>
        <button v-if="editingSection !== 'price'" class="edit-btn" @click="startEditing('price')">
          Modifier
        </button>
        <div v-else class="edit-section-actions">
          <button class="edit-action-btn edit-action-btn--cancel" @click="cancelEditing">
            Annuler
          </button>
          <button class="edit-action-btn edit-action-btn--ok" @click="confirmSection">OK</button>
        </div>
      </div>
      <div v-if="editingSection !== 'price'" class="edit-section-summary">
        <div class="price-summary">
          <div class="price-summary-line">
            <span>Location ({{ nightsCount }} nuits)</span>
            <span class="price-summary-value">{{ formatPrice(form.rentalPrice) }}</span>
          </div>
          <div v-if="form.cleaningIncluded" class="price-summary-line">
            <span>Menage</span>
            <span v-if="form.cleaningOffered" class="price-offered">Offert</span>
            <span v-else class="price-summary-value">{{ formatPrice(cleaningPrice) }}</span>
          </div>
          <div v-if="form.linenIncluded" class="price-summary-line">
            <span>Linge</span>
            <span v-if="form.linenOffered" class="price-offered">Offert</span>
            <span v-else class="price-summary-value">{{ formatPrice(linenPrice) }}</span>
          </div>
          <div v-if="touristTaxPrice > 0" class="price-summary-line">
            <span>Taxe de sejour</span>
            <span class="price-summary-value">{{ formatPrice(touristTaxPrice) }}</span>
          </div>
          <div class="price-summary-line price-summary-line--total">
            <span>TOTAL</span>
            <span class="price-summary-value">{{ formatPrice(totalPrice) }}</span>
          </div>
        </div>
        <!-- Detail du calcul si disponible -->
        <div v-if="priceCalculation && priceCalculation.details.length > 0" class="price-details">
          <p class="price-details-title">Detail du calcul :</p>
          <div
            v-for="detail in priceCalculation.details"
            :key="detail.seasonId + detail.startDate"
            class="price-detail-line"
          >
            <span
              >{{ detail.nights }} nuit{{ detail.nights > 1 ? 's' : '' }}
              {{ detail.seasonName }}</span
            >
            <span
              >{{ detail.nights }} x {{ formatPrice(detail.pricePerNight) }} =
              {{ formatPrice(detail.subtotal) }}</span
            >
          </div>
          <p v-if="priceCalculation.isWeeklyRate" class="price-details-note">
            Tarif hebdomadaire applique
          </p>
        </div>
      </div>
      <div v-else class="edit-section-form">
        <div class="price-edit-options">
          <button
            class="price-option-btn"
            :class="{ 'price-option-btn--active': !form.manualPrice }"
            :disabled="loadingPrice"
            @click="handleRecalculatePrice"
          >
            <div v-if="loadingPrice" class="price-spinner"></div>
            <template v-else>Recalculer automatiquement</template>
          </button>
          <button
            class="price-option-btn"
            :class="{ 'price-option-btn--active': form.manualPrice }"
            @click="form.manualPrice = true"
          >
            Prix manuel
          </button>
        </div>
        <div v-if="form.manualPrice" class="form-field">
          <label class="form-label">Prix de la location (€)</label>
          <input
            v-model.number="form.rentalPrice"
            type="number"
            class="form-input form-input--price"
            min="0"
            step="10"
          />
        </div>
        <p v-else-if="priceCalculation" class="auto-price-info">
          Prix calcule : {{ formatPrice(priceCalculation.totalPrice) }} ({{
            priceCalculation.totalNights
          }}
          nuits)
        </p>
      </div>
    </div>

    <template #actions>
      <button class="modal-cancel-btn" :disabled="submitting" @click="emit('close')">
        Annuler
      </button>
      <button class="modal-save-btn" :disabled="submitting || !hasChanges" @click="handleSubmit">
        {{ submitting ? 'Enregistrement...' : 'Enregistrer les modifications' }}
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

.client-summary-name {
  font-weight: 600;
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

.form-input--error:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-field-error {
  font-size: 13px;
  color: #dc2626;
  margin-top: 4px;
  margin-bottom: 0;
}

.form-input--price {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
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

.date-warning {
  color: #dc2626;
  font-weight: 500;
}

/* Counter */
.counter-control {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.counter-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  background-color: white;
  font-size: 24px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.counter-btn:hover:not(:disabled) {
  border-color: #ff385c;
  color: #ff385c;
}

.counter-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.counter-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  min-width: 40px;
  text-align: center;
}

.counter-hint {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  margin: 8px 0 0;
}

.counter-section-label {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  margin: 16px 0 8px;
}

/* Options toggles */
.toggle-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: white;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.toggle-option:hover {
  background-color: #f0fdf4;
}

.toggle-checkbox {
  width: 22px;
  height: 22px;
  accent-color: #10b981;
  cursor: pointer;
}

.toggle-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.toggle-name {
  font-size: 15px;
  color: #111827;
}

.toggle-price {
  font-size: 13px;
  color: #6b7280;
}

/* Options list (summary) */
.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option-item {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  background-color: #f3f4f6;
  color: #9ca3af;
}

.option-item--active {
  background-color: #d1fae5;
  color: #059669;
}

/* Offer inline toggle */
.offer-inline-toggle {
  padding: 6px 12px 6px 46px;
  margin-top: -4px;
  margin-bottom: 8px;
}

.offer-inline-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #059669;
  cursor: pointer;
}

.offer-inline-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #10b981;
}

.price-offered {
  color: #10b981;
  font-weight: 600;
  font-size: 14px;
}

/* Price summary */
.price-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #374151;
  padding: 4px 0;
}

.price-summary-value {
  font-weight: 500;
}

.price-summary-line--total {
  border-top: 2px solid #111827;
  margin-top: 6px;
  padding-top: 8px;
  font-weight: 700;
  font-size: 16px;
  color: #111827;
}

.price-summary-line--total .price-summary-value {
  font-weight: 700;
}

/* Price details */
.price-details {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #bae6fd;
}

.price-details-title {
  font-size: 12px;
  font-weight: 600;
  color: #0369a1;
  margin: 0 0 6px;
}

.price-detail-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #0c4a6e;
  padding: 2px 0;
}

.price-details-note {
  font-size: 12px;
  color: #0369a1;
  font-style: italic;
  margin: 6px 0 0;
}

/* Price edit */
.price-edit-options {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.price-option-btn {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid #d1d5db;
  border-radius: 10px;
  background-color: white;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.price-option-btn:hover:not(:disabled) {
  border-color: #9ca3af;
}

.price-option-btn--active {
  border-color: #ff385c;
  background-color: #fff0f3;
  color: #ff385c;
}

.price-option-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.price-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e7eb;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auto-price-info {
  font-size: 14px;
  color: #059669;
  font-weight: 500;
  margin: 0;
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

/* Mobile */
@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .price-edit-options {
    flex-direction: column;
  }

  .edit-section-header {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
