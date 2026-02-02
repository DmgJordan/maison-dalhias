<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNewBookingFormStore } from '../../stores/newBookingForm';
import { bookingsApi } from '../../lib/api';
import DatePicker from '../../components/admin/DatePicker.vue';

const router = useRouter();
const formStore = useNewBookingFormStore();

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

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(price);
};

const fetchBookedDates = async (): Promise<void> => {
  try {
    bookedDates.value = await bookingsApi.getBookedDates();
  } catch (err) {
    console.error('Erreur lors du chargement des dates:', err);
  }
};

const checkDateConflicts = async (): Promise<boolean> => {
  if (!formStore.startDate || !formStore.endDate) return false;
  try {
    return await bookingsApi.checkConflicts(formStore.startDate, formStore.endDate);
  } catch (err) {
    console.error('Erreur lors de la verification des conflits:', err);
    return true;
  }
};

const handleNext = async (): Promise<void> => {
  error.value = null;

  // Verification speciale pour l'etape 1 (dates)
  if (currentStep.value === 1) {
    const hasConflict = await checkDateConflicts();
    if (hasConflict) {
      error.value = "Ces dates sont deja reservees. Veuillez choisir d'autres dates.";
      return;
    }
  }

  // Calculer le prix suggere quand on passe a l'etape 5
  if (currentStep.value === 4) {
    formStore.calculateSuggestedPrice();
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

    successMessage.value = 'Reservation creee avec succes !';
    formStore.reset();

    setTimeout(() => {
      router.push('/admin/reservations');
    }, 2000);
  } catch (err) {
    console.error('Erreur lors de la creation de la reservation:', err);
    error.value = 'Impossible de creer la reservation. Veuillez reessayer.';
  } finally {
    loading.value = false;
  }
};

const handleReset = (): void => {
  formStore.reset();
  error.value = null;
};

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
        <p class="step-description">Selectionnez les dates de sejour (minimum 3 nuits)</p>

        <div class="form-group">
          <DatePicker
            v-model="formStore.startDate"
            label="Date d'arrivee"
            placeholder="Choisir la date d'arrivee"
            :min-date="minDate"
            :disabled-dates="bookedDates"
          />
        </div>

        <div class="form-group">
          <DatePicker
            v-model="formStore.endDate"
            label="Date de depart"
            placeholder="Choisir la date de depart"
            :min-date="minEndDate"
            :disabled="!formStore.startDate"
            :disabled-dates="bookedDates"
          />
        </div>

        <div v-if="formStore.nightsCount > 0" class="date-summary">
          <div class="summary-item">
            <span class="summary-label">Duree</span>
            <span class="summary-value"
              >{{ formStore.nightsCount }} nuit{{ formStore.nightsCount > 1 ? 's' : '' }}</span
            >
          </div>
        </div>

        <p v-if="formStore.startDate && formStore.nightsCount < 3" class="form-error">
          Le sejour minimum est de 3 nuits
        </p>
      </div>

      <!-- Etape 2 : Client -->
      <div v-if="currentStep === 2" class="step-panel">
        <h2 class="step-title">Qui est le client ?</h2>
        <p class="step-description">Informations du locataire principal</p>

        <div class="form-row">
          <div class="form-group">
            <label for="firstName" class="form-label">Prenom</label>
            <input
              id="firstName"
              v-model="formStore.primaryClient.firstName"
              type="text"
              class="form-input"
              placeholder="Jean"
            />
          </div>
          <div class="form-group">
            <label for="lastName" class="form-label">Nom</label>
            <input
              id="lastName"
              v-model="formStore.primaryClient.lastName"
              type="text"
              class="form-input"
              placeholder="Dupont"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="address" class="form-label">Adresse</label>
          <input
            id="address"
            v-model="formStore.primaryClient.address"
            type="text"
            class="form-input"
            placeholder="12 rue de la Paix"
          />
        </div>

        <div class="form-row">
          <div class="form-group form-group--small">
            <label for="postalCode" class="form-label">Code postal</label>
            <input
              id="postalCode"
              v-model="formStore.primaryClient.postalCode"
              type="text"
              class="form-input"
              placeholder="75001"
              maxlength="5"
            />
          </div>
          <div class="form-group">
            <label for="city" class="form-label">Ville</label>
            <input
              id="city"
              v-model="formStore.primaryClient.city"
              type="text"
              class="form-input"
              placeholder="Paris"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="phone" class="form-label">Telephone</label>
          <input
            id="phone"
            v-model="formStore.primaryClient.phone"
            type="tel"
            class="form-input"
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="formStore.primaryClient.email"
            type="email"
            class="form-input"
            placeholder="jean.dupont@email.fr"
          />
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
              <label for="secondFirstName" class="form-label">Prenom</label>
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
          <label class="form-label">Dont adultes (pour la taxe de sejour)</label>
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
          <p class="form-hint">Les mineurs sont exemptes de taxe de sejour (1 EUR/nuit/adulte)</p>
        </div>
      </div>

      <!-- Etape 4 : Options -->
      <div v-if="currentStep === 4" class="step-panel">
        <h2 class="step-title">Options du sejour</h2>
        <p class="step-description">Cochez les options souhaitees</p>

        <div class="options-list">
          <label
            class="option-card"
            :class="{ 'option-card--selected': formStore.cleaningIncluded }"
          >
            <input v-model="formStore.cleaningIncluded" type="checkbox" class="option-input" />
            <div class="option-content">
              <div class="option-header">
                <span class="option-name">Menage fin de sejour</span>
                <span class="option-price">80 EUR</span>
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

          <label class="option-card" :class="{ 'option-card--selected': formStore.linenIncluded }">
            <input v-model="formStore.linenIncluded" type="checkbox" class="option-input" />
            <div class="option-content">
              <div class="option-header">
                <span class="option-name">Linge de maison</span>
                <span class="option-price">15 EUR/personne</span>
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
          <p>La taxe de sejour (1 EUR/nuit/adulte) est automatiquement incluse.</p>
        </div>
      </div>

      <!-- Etape 5 : Tarif -->
      <div v-if="currentStep === 5" class="step-panel">
        <h2 class="step-title">Tarif de la location</h2>
        <p class="step-description">Ajustez le prix si necessaire</p>

        <div class="price-suggestion">
          <div class="suggestion-header">
            <span class="suggestion-label">Prix suggere</span>
            <span class="suggestion-value">{{ formatPrice(formStore.pricePerNight) }}/nuit</span>
          </div>
          <p class="suggestion-note">Base sur la periode ({{ formStore.nightsCount }} nuits)</p>
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
            <span class="price-suffix">EUR</span>
          </div>
        </div>

        <div class="price-breakdown">
          <h3 class="breakdown-title">Recapitulatif des couts</h3>
          <div class="breakdown-line">
            <span>Location ({{ formStore.nightsCount }} nuits)</span>
            <span>{{ formatPrice(formStore.rentalPrice) }}</span>
          </div>
          <div v-if="formStore.cleaningIncluded" class="breakdown-line">
            <span>Menage</span>
            <span>{{ formatPrice(formStore.cleaningPrice) }}</span>
          </div>
          <div v-if="formStore.linenIncluded" class="breakdown-line">
            <span>Linge ({{ formStore.occupantsCount }} pers.)</span>
            <span>{{ formatPrice(formStore.linenPrice) }}</span>
          </div>
          <div class="breakdown-line">
            <span>Taxe de sejour</span>
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
        <h2 class="step-title">Verifiez les informations</h2>
        <p class="step-description">Confirmez pour creer la reservation</p>

        <div class="recap-section">
          <h3 class="recap-title">Dates du sejour</h3>
          <div class="recap-content">
            <p><strong>Arrivee :</strong> {{ formatDate(formStore.startDate) }}</p>
            <p><strong>Depart :</strong> {{ formatDate(formStore.endDate) }}</p>
            <p><strong>Duree :</strong> {{ formStore.nightsCount }} nuits</p>
          </div>
        </div>

        <div class="recap-section">
          <h3 class="recap-title">Client</h3>
          <div class="recap-content">
            <p><strong>Nom :</strong> {{ formStore.clientFullName }}</p>
            <p>
              <strong>Adresse :</strong> {{ formStore.primaryClient.address }},
              {{ formStore.primaryClient.postalCode }} {{ formStore.primaryClient.city }}
            </p>
            <p><strong>Telephone :</strong> {{ formStore.primaryClient.phone }}</p>
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
            <p v-if="formStore.cleaningIncluded">Menage fin de sejour : 80 EUR</p>
            <p v-if="formStore.linenIncluded">
              Linge de maison : {{ formatPrice(formStore.linenPrice) }}
            </p>
            <p v-if="!formStore.cleaningIncluded && !formStore.linenIncluded">Aucune option</p>
          </div>
        </div>

        <div class="recap-section recap-section--highlight">
          <h3 class="recap-title">Montants</h3>
          <div class="recap-content">
            <div class="recap-price-line">
              <span>Total a payer</span>
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
            <p class="recap-deposit">+ Depot de garantie : 500 EUR (cheque non encaisse)</p>
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
        Precedent
      </button>
      <button v-else class="nav-btn nav-btn--reset" @click="handleReset">Recommencer</button>

      <button
        v-if="currentStep < 6"
        class="nav-btn nav-btn--next"
        :disabled="!formStore.canProceed"
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
          Creer la reservation
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
  flex-shrink: 0;
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

  .progress-bar {
    padding: 0;
  }

  .step-label {
    font-size: 12px;
  }
}
</style>
