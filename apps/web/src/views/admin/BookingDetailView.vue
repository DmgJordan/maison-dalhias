<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  bookingsApi,
  emailApi,
  pdfApi,
  type Booking,
  type PriceCalculation,
  type EmailLog,
} from '../../lib/api';
import { OPTION_PRICES, PAYMENT_PERCENTAGES } from '../../constants/pricing';
import BookingEditModal from '../../components/admin/BookingEditModal.vue';
import EmailSendModal from '../../components/admin/EmailSendModal.vue';
import EmailHistoryCard from '../../components/admin/EmailHistoryCard.vue';

const route = useRoute();
const router = useRouter();

const booking = ref<Booking | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const showEditModal = ref(false);
const generatingContract = ref(false);
const generatingInvoice = ref(false);
const bookedDates = ref<string[]>([]);
const priceCalculation = ref<PriceCalculation | null>(null);
const priceMismatch = ref(false);

// Email state
const emailLogs = ref<EmailLog[]>([]);
const showEmailModal = ref(false);
const emailModalDocTypes = ref<('contract' | 'invoice')[]>([]);
const showSuccessScreen = ref(false);
const lastSentEmail = ref<EmailLog | null>(null);
const loadingEmails = ref(false);
const showAllEmails = ref(false);

const bookingId = computed((): string => route.params.id as string);

const nightsCount = computed((): number => {
  if (!booking.value) return 0;
  const start = new Date(booking.value.startDate);
  const end = new Date(booking.value.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const adultsCount = computed((): number => {
  return booking.value?.adultsCount ?? 0;
});

const cleaningPrice = computed((): number => {
  if (!booking.value?.cleaningIncluded || booking.value.cleaningOffered) return 0;
  return OPTION_PRICES.CLEANING;
});

const linenPrice = computed((): number => {
  if (!booking.value?.linenIncluded || booking.value.linenOffered) return 0;
  return OPTION_PRICES.LINEN_PER_PERSON * (booking.value.occupantsCount ?? 0);
});

const touristTaxPrice = computed((): number => {
  if (!booking.value?.touristTaxIncluded) return 0;
  return OPTION_PRICES.TOURIST_TAX_PER_ADULT_PER_NIGHT * adultsCount.value * nightsCount.value;
});

const totalPrice = computed((): number => {
  if (!booking.value) return 0;
  const raw = booking.value.rentalPrice;
  const rental = raw == null ? 0 : typeof raw === 'string' ? parseFloat(raw) : raw;
  return rental + cleaningPrice.value + linenPrice.value + touristTaxPrice.value;
});

const depositAmount = computed((): number => {
  return Math.round(totalPrice.value * PAYMENT_PERCENTAGES.DEPOSIT);
});

const balanceAmount = computed((): number => {
  return totalPrice.value - depositAmount.value;
});

const statusLabel = computed((): string => {
  switch (booking.value?.status) {
    case 'CONFIRMED':
      return 'Confirmee';
    case 'PENDING':
      return 'En attente';
    case 'CANCELLED':
      return 'Annulee';
    default:
      return booking.value?.status ?? '';
  }
});

const statusClass = computed((): string => {
  switch (booking.value?.status) {
    case 'CONFIRMED':
      return 'status--confirmed';
    case 'PENDING':
      return 'status--pending';
    case 'CANCELLED':
      return 'status--cancelled';
    default:
      return '';
  }
});

const hasClientEmail = computed((): boolean => {
  return !!booking.value?.primaryClient?.email;
});

const visibleEmailLogs = computed((): EmailLog[] => {
  if (showAllEmails.value) return emailLogs.value;
  return emailLogs.value.slice(0, 2);
});

const modifiedSinceLastSend = computed((): boolean => {
  if (!booking.value || emailLogs.value.length === 0) return false;
  const lastLog = emailLogs.value[0]; // Sorted by sentAt desc
  return new Date(booking.value.updatedAt) > new Date(lastLog.sentAt);
});

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatPrice = (price: number | string | undefined): string => {
  if (price === undefined || price === null) return '-';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(numPrice);
};

const formatClientName = (client: Booking['primaryClient']): string => {
  if (!client) return 'Non renseigne';
  return `${client.firstName} ${client.lastName}`;
};

const formatClientAddress = (client: Booking['primaryClient']): string => {
  if (!client) return '';
  return `${client.address}, ${client.postalCode} ${client.city}`;
};

const fetchBooking = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    booking.value = await bookingsApi.getById(bookingId.value);
  } catch (err: unknown) {
    console.error('Erreur lors du chargement de la reservation:', err);
    error.value = 'Impossible de charger la reservation. Veuillez reessayer.';
  } finally {
    loading.value = false;
  }
};

const checkPriceConsistency = async (): Promise<void> => {
  if (!booking.value) return;
  try {
    const result = await bookingsApi.recalculatePrice(booking.value.id);
    priceCalculation.value = result;
    const rawPrice = booking.value.rentalPrice;
    const storedPrice =
      rawPrice == null ? 0 : typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
    priceMismatch.value = Math.abs(storedPrice - result.totalPrice) > 0.01;
  } catch {
    // Silencieux si erreur
  }
};

const handleUpdatePrice = async (): Promise<void> => {
  if (!booking.value || !priceCalculation.value) return;
  try {
    loading.value = true;
    await bookingsApi.update(booking.value.id, {
      rentalPrice: priceCalculation.value.totalPrice,
    });
    await fetchBooking();
    priceMismatch.value = false;
    showSuccess('Prix mis a jour !');
  } catch {
    error.value = 'Impossible de mettre a jour le prix.';
  } finally {
    loading.value = false;
  }
};

const showSuccess = (message: string): void => {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = null;
  }, 3000);
};

const handleConfirm = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    await bookingsApi.confirm(bookingId.value);
    await fetchBooking();
    showSuccess('Reservation confirmee !');
  } catch (err: unknown) {
    console.error('Erreur lors de la confirmation:', err);
    error.value = 'Impossible de confirmer la reservation. Veuillez reessayer.';
  } finally {
    loading.value = false;
  }
};

const handleCancel = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    await bookingsApi.cancel(bookingId.value);
    await fetchBooking();
    showSuccess('Reservation annulee.');
  } catch (err: unknown) {
    console.error("Erreur lors de l'annulation:", err);
    error.value = "Impossible d'annuler la reservation. Veuillez reessayer.";
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    showDeleteConfirm.value = false;
    await bookingsApi.delete(bookingId.value);
    showSuccess('Reservation supprimee.');
    setTimeout(() => {
      router.push('/admin/reservations');
    }, 1500);
  } catch (err: unknown) {
    console.error('Erreur lors de la suppression:', err);
    error.value = 'Impossible de supprimer la reservation. Veuillez reessayer.';
  } finally {
    loading.value = false;
  }
};

const goBack = (): void => {
  router.push('/admin/reservations');
};

const handleOpenEdit = async (): Promise<void> => {
  try {
    bookedDates.value = await bookingsApi.getBookedDates();
  } catch {
    // Continuer sans les dates réservées
  }
  showEditModal.value = true;
};

const handleBookingUpdated = async (updatedBooking: Booking): Promise<void> => {
  booking.value = updatedBooking;
  showEditModal.value = false;
  showSuccess('Reservation modifiee !');
  await fetchBooking();
};

const handleGenerateContract = async (): Promise<void> => {
  if (!booking.value) return;

  try {
    generatingContract.value = true;
    error.value = null;
    await pdfApi.downloadContract(booking.value.id);
    showSuccess('Contrat telecharge !');
  } catch (err: unknown) {
    console.error('Erreur lors de la generation du contrat:', err);
    error.value = 'Impossible de generer le contrat. Veuillez reessayer.';
  } finally {
    generatingContract.value = false;
  }
};

const handleGenerateInvoice = async (): Promise<void> => {
  if (!booking.value) return;

  try {
    generatingInvoice.value = true;
    error.value = null;
    await pdfApi.downloadInvoice(booking.value.id);
    showSuccess('Facture telechargee !');
  } catch (err: unknown) {
    console.error('Erreur lors de la generation de la facture:', err);
    error.value = 'Impossible de generer la facture. Veuillez reessayer.';
  } finally {
    generatingInvoice.value = false;
  }
};

const fetchEmailHistory = async (): Promise<void> => {
  if (!booking.value) return;
  try {
    loadingEmails.value = true;
    emailLogs.value = await emailApi.getByBooking(booking.value.id);
  } catch (err: unknown) {
    console.error("Erreur lors du chargement de l'historique des emails:", err);
  } finally {
    loadingEmails.value = false;
  }
};

const openEmailModal = (docTypes: ('contract' | 'invoice')[]): void => {
  emailModalDocTypes.value = docTypes;
  showEmailModal.value = true;
};

const handleEmailSent = async (emailLog: EmailLog): Promise<void> => {
  showEmailModal.value = false;
  lastSentEmail.value = emailLog;
  showSuccessScreen.value = true;
  await fetchEmailHistory();
};

const dismissSuccessScreen = (): void => {
  showSuccessScreen.value = false;
  lastSentEmail.value = null;
};

const handleResend = (emailLog: EmailLog): void => {
  emailModalDocTypes.value = emailLog.documentTypes;
  showEmailModal.value = true;
};

onMounted(async () => {
  await fetchBooking();
  await Promise.all([checkPriceConsistency(), fetchEmailHistory()]);
});
</script>

<template>
  <div class="booking-detail">
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

    <!-- Bouton retour -->
    <button class="back-btn" @click="goBack">
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
      Retour aux reservations
    </button>

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

    <!-- Chargement -->
    <div v-if="loading && !booking" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement de la reservation...</p>
    </div>

    <!-- Contenu -->
    <template v-else-if="booking">
      <!-- En-tete avec statut -->
      <div class="detail-header">
        <div class="header-top">
          <span class="status-badge" :class="statusClass">
            {{ statusLabel }}
          </span>
          <span class="booking-id">Ref. {{ booking.id.slice(0, 8) }}</span>
        </div>
        <h1 class="detail-title">
          {{ formatShortDate(booking.startDate) }} - {{ formatShortDate(booking.endDate) }}
        </h1>
        <p class="detail-subtitle">{{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}</p>
      </div>

      <!-- Layout 2 colonnes desktop -->
      <div class="detail-columns">
        <!-- Colonne gauche : Séjour + Client -->
        <div class="detail-column detail-column--left">
          <!-- Section Dates -->
          <section class="detail-section">
            <h2 class="section-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="section-icon"
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
              Dates du sejour
            </h2>
            <div class="dates-grid">
              <div class="date-card">
                <span class="date-label">Arrivee</span>
                <span class="date-value">{{ formatDate(booking.startDate) }}</span>
                <span class="date-time">A partir de 16h00</span>
              </div>
              <div class="date-card">
                <span class="date-label">Depart</span>
                <span class="date-value">{{ formatDate(booking.endDate) }}</span>
                <span class="date-time">Avant 11h00</span>
              </div>
            </div>
          </section>

          <!-- Section Client -->
          <section class="detail-section">
            <h2 class="section-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="section-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Client
            </h2>
            <div class="client-card">
              <div class="client-name">{{ formatClientName(booking.primaryClient) }}</div>
              <div v-if="booking.primaryClient" class="client-details">
                <p class="client-address">{{ formatClientAddress(booking.primaryClient) }}</p>
                <div class="client-contacts">
                  <a
                    v-if="booking.primaryClient.phone"
                    :href="`tel:${booking.primaryClient.phone}`"
                    class="contact-link"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="contact-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                      />
                    </svg>
                    {{ booking.primaryClient.phone }}
                  </a>
                  <span v-if="booking.primaryClient.email" class="contact-link contact-link--email">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="contact-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                      />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {{ booking.primaryClient.email }}
                  </span>
                </div>
              </div>
              <div v-if="booking.secondaryClient" class="secondary-client">
                <span class="secondary-label">Accompagne de :</span>
                <span class="secondary-name">{{ formatClientName(booking.secondaryClient) }}</span>
              </div>
              <div class="occupants-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="occupants-icon"
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
                <span
                  >{{ booking.occupantsCount ?? '-' }} personne{{
                    (booking.occupantsCount ?? 0) > 1 ? 's' : ''
                  }}</span
                >
              </div>
            </div>
          </section>

          <!-- Section Tarifs -->
          <section class="detail-section">
            <h2 class="section-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="section-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Tarifs
            </h2>
            <div class="price-card">
              <div class="price-line">
                <span class="price-label">Location ({{ nightsCount }} nuits)</span>
                <span class="price-value">{{ formatPrice(booking.rentalPrice) }}</span>
              </div>
              <div v-if="booking.cleaningIncluded" class="price-line">
                <span class="price-label">Menage fin de sejour</span>
                <span v-if="booking.cleaningOffered" class="price-offered">Offert</span>
                <span v-else class="price-value">{{ formatPrice(cleaningPrice) }}</span>
              </div>
              <div v-if="booking.linenIncluded" class="price-line">
                <span class="price-label"
                  >Linge de maison ({{ booking.occupantsCount ?? '-' }} pers.)</span
                >
                <span v-if="booking.linenOffered" class="price-offered">Offert</span>
                <span v-else class="price-value">{{ formatPrice(linenPrice) }}</span>
              </div>
              <div v-if="booking.touristTaxIncluded" class="price-line">
                <span class="price-label">Taxe de sejour</span>
                <span class="price-value">{{ formatPrice(touristTaxPrice) }}</span>
              </div>
              <div class="price-line price-line--total">
                <span class="price-label">Total</span>
                <span class="price-value">{{ formatPrice(totalPrice) }}</span>
              </div>
            </div>

            <!-- Avertissement prix incoherent -->
            <div
              v-if="priceMismatch && priceCalculation && booking.status === 'PENDING'"
              class="price-warning"
            >
              <div class="price-warning-text">
                <strong>Prix potentiellement incorrect</strong>
                <p>
                  Prix stocke : {{ formatPrice(booking.rentalPrice) }} | Prix recalcule :
                  {{ formatPrice(priceCalculation.totalPrice) }}
                </p>
              </div>
              <button class="price-warning-btn" :disabled="loading" @click="handleUpdatePrice">
                Mettre a jour
              </button>
            </div>

            <!-- Detail tarifaire -->
            <div
              v-if="priceCalculation && priceCalculation.details.length > 0"
              class="price-breakdown"
            >
              <h3 class="breakdown-title">Detail du calcul</h3>
              <div
                v-for="detail in priceCalculation.details"
                :key="detail.seasonId + detail.startDate"
                class="breakdown-line"
              >
                <span
                  >{{ detail.nights }} nuit{{ detail.nights > 1 ? 's' : '' }}
                  {{ detail.seasonName }}</span
                >
                <span
                  >{{ detail.nights }} x {{ formatPrice(detail.pricePerNight) }}/nuit =
                  {{ formatPrice(detail.subtotal) }}</span
                >
              </div>
              <p v-if="priceCalculation.isWeeklyRate" class="breakdown-note">
                Tarif hebdomadaire applique
              </p>
            </div>

            <!-- Echeances -->
            <div class="payment-schedule">
              <h3 class="schedule-title">Echeances de paiement</h3>
              <div class="schedule-item">
                <span class="schedule-label">Acompte (30%)</span>
                <span class="schedule-value">{{ formatPrice(depositAmount) }}</span>
              </div>
              <div class="schedule-item">
                <span class="schedule-label">Solde (15 jours avant)</span>
                <span class="schedule-value">{{ formatPrice(balanceAmount) }}</span>
              </div>
              <div class="schedule-item schedule-item--deposit">
                <span class="schedule-label">Depot de garantie</span>
                <span class="schedule-value"
                  >{{ OPTION_PRICES.SECURITY_DEPOSIT }} € (cheque non encaisse)</span
                >
              </div>
            </div>
          </section>
        </div>

        <!-- Colonne droite : Actions + Documents + Historique emails -->
        <div class="detail-column detail-column--right">
          <!-- Section Actions -->
          <section v-if="booking.status !== 'CANCELLED'" class="detail-section">
            <h2 class="section-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="section-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              Actions
            </h2>
            <div class="actions-card">
              <button
                v-if="booking.status === 'PENDING'"
                class="action-btn action-btn--primary"
                :disabled="loading"
                @click="handleOpenEdit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Modifier la reservation
              </button>

              <div v-if="booking.status === 'PENDING'" class="action-row">
                <button
                  class="action-btn action-btn--confirm"
                  :disabled="loading"
                  @click="handleConfirm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Confirmer
                </button>

                <button
                  class="action-btn action-btn--cancel"
                  :disabled="loading"
                  @click="handleCancel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Annuler
                </button>
              </div>

              <button
                class="action-btn action-btn--delete"
                :disabled="loading"
                @click="showDeleteConfirm = true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  />
                </svg>
                Supprimer
              </button>
            </div>
          </section>

          <!-- Section Documents PDF -->
          <section class="detail-section">
            <h2 class="section-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="section-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Documents
            </h2>

            <!-- Modified since last send alert -->
            <div v-if="modifiedSinceLastSend" class="modified-alert" role="alert">
              La reservation a ete modifiee depuis le dernier envoi. Pensez a renvoyer les
              documents.
            </div>

            <!-- Success screen -->
            <div v-if="showSuccessScreen && lastSentEmail" class="success-screen">
              <div class="success-icon-large">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 class="success-heading">Email envoye avec succes !</h3>
              <div class="success-recap">
                <p>
                  <strong>Destinataire :</strong> {{ lastSentEmail.recipientName }} ({{
                    lastSentEmail.recipientEmail
                  }})
                </p>
                <p>
                  <strong>Documents :</strong>
                  {{
                    lastSentEmail.documentTypes
                      .map((t) => (t === 'contract' ? 'Contrat' : 'Facture'))
                      .join(', ')
                  }}
                </p>
                <p>
                  <strong>Envoye le :</strong>
                  {{
                    new Date(lastSentEmail.sentAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }}
                </p>
              </div>
              <button class="btn-back-to-booking" @click="dismissSuccessScreen">
                Retour a la reservation
              </button>
            </div>

            <!-- Document buttons (hidden during success screen) -->
            <template v-if="!showSuccessScreen">
              <div class="documents-grid">
                <button
                  class="document-btn document-btn--active"
                  :disabled="generatingContract"
                  @click="handleGenerateContract"
                >
                  <svg
                    v-if="!generatingContract"
                    xmlns="http://www.w3.org/2000/svg"
                    class="document-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <div v-else class="document-spinner"></div>
                  <span class="document-label">Contrat de location</span>
                  <span class="document-status document-status--ready">
                    {{ generatingContract ? 'Generation...' : 'Telecharger' }}
                  </span>
                </button>
                <button
                  class="document-btn document-btn--active"
                  :disabled="generatingInvoice"
                  @click="handleGenerateInvoice"
                >
                  <svg
                    v-if="!generatingInvoice"
                    xmlns="http://www.w3.org/2000/svg"
                    class="document-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <div v-else class="document-spinner"></div>
                  <span class="document-label">Facture</span>
                  <span class="document-status document-status--ready">
                    {{ generatingInvoice ? 'Generation...' : 'Telecharger' }}
                  </span>
                </button>
              </div>

              <!-- Email send buttons -->
              <template v-if="booking.status !== 'CANCELLED'">
                <div v-if="!hasClientEmail" class="email-warning">
                  Adresse email du client requise pour l'envoi.
                </div>
                <div class="email-send-buttons">
                  <button
                    class="email-btn"
                    :disabled="!hasClientEmail"
                    @click="openEmailModal(['contract'])"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="email-btn-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                      />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Envoyer le contrat par email
                  </button>
                  <button
                    class="email-btn"
                    :disabled="!hasClientEmail"
                    @click="openEmailModal(['invoice'])"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="email-btn-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                      />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Envoyer la facture par email
                  </button>
                  <button
                    class="email-btn email-btn--both"
                    :disabled="!hasClientEmail"
                    @click="openEmailModal(['contract', 'invoice'])"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="email-btn-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                      />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Envoyer les deux par email
                  </button>
                </div>
              </template>
            </template>
          </section>

          <!-- Email History Section -->
          <section v-if="emailLogs.length > 0" class="detail-section">
            <h2 class="section-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="section-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Historique des emails
            </h2>
            <div class="email-history-list">
              <EmailHistoryCard
                v-for="log in visibleEmailLogs"
                :key="log.id"
                :email-log="log"
                @resend="handleResend"
              />
            </div>
            <button
              v-if="!showAllEmails && emailLogs.length > 2"
              class="show-all-emails-btn"
              @click="showAllEmails = true"
            >
              Voir tout l'historique ({{ emailLogs.length }})
            </button>
          </section>
        </div>
      </div>
    </template>

    <!-- Modal de confirmation suppression -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal-content">
            <h3 class="modal-title">Supprimer cette reservation ?</h3>
            <p class="modal-text">Cette action est irreversible.</p>
            <div class="modal-actions">
              <button class="modal-btn modal-btn--cancel" @click="showDeleteConfirm = false">
                Annuler
              </button>
              <button
                class="modal-btn modal-btn--confirm"
                :disabled="loading"
                @click="handleDelete"
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal de modification -->
    <BookingEditModal
      v-if="showEditModal && booking"
      :booking="booking"
      :booked-dates="bookedDates"
      @close="showEditModal = false"
      @updated="handleBookingUpdated"
    />

    <!-- Modal d'envoi email -->
    <EmailSendModal
      v-if="booking"
      :booking="booking"
      :initial-document-types="emailModalDocTypes"
      :show="showEmailModal"
      @close="showEmailModal = false"
      @sent="handleEmailSent"
    />
  </div>
</template>

<style scoped>
.booking-detail {
  max-width: 600px;
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

/* Bouton retour */
.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #484848;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.back-btn:hover {
  background-color: #f7f7f7;
  border-color: #d4d4d4;
}

.back-btn svg {
  width: 18px;
  height: 18px;
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

/* Etats */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
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

.loading-state p {
  margin-top: 16px;
  font-size: 16px;
  color: #717171;
}

/* En-tete */
.detail-header {
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status--confirmed {
  background-color: #d1fae5;
  color: #059669;
}

.status--pending {
  background-color: #fef3c7;
  color: #d97706;
}

.status--cancelled {
  background-color: #fee2e2;
  color: #dc2626;
}

.booking-id {
  font-size: 13px;
  color: #717171;
  font-family: monospace;
}

.detail-title {
  font-size: 22px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 4px 0;
}

.detail-subtitle {
  font-size: 15px;
  color: #717171;
  margin: 0;
}

/* Sections */
.detail-section {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #222222;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: #ff385c;
}

/* Dates */
.dates-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.date-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 12px;
}

.date-label {
  font-size: 12px;
  color: #717171;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-value {
  font-size: 14px;
  font-weight: 600;
  color: #222222;
  line-height: 1.3;
}

.date-time {
  font-size: 13px;
  color: #717171;
}

/* Client */
.client-card {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 12px;
}

.client-name {
  font-size: 18px;
  font-weight: 600;
  color: #222222;
  margin-bottom: 8px;
}

.client-details {
  margin-bottom: 12px;
}

.client-address {
  font-size: 14px;
  color: #484848;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.client-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: white;
  border-radius: 8px;
  font-size: 14px;
  color: #484848;
  text-decoration: none;
  transition: all 0.2s;
}

.contact-link:hover {
  background-color: #fff0f3;
  color: #ff385c;
}

.contact-icon {
  width: 16px;
  height: 16px;
}

.secondary-client {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 0;
  border-top: 1px solid #e5e5e5;
  margin-top: 12px;
}

.secondary-label {
  font-size: 14px;
  color: #717171;
}

.secondary-name {
  font-size: 14px;
  font-weight: 500;
  color: #484848;
}

.occupants-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
  margin-top: 12px;
  font-size: 15px;
  color: #484848;
}

.occupants-icon {
  width: 18px;
  height: 18px;
  color: #717171;
}

/* Tarifs */
.price-card {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.price-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e8e8e8;
}

.price-line:last-child {
  border-bottom: none;
}

.price-line--total {
  border-top: 2px solid #222222;
  margin-top: 8px;
  padding-top: 16px;
}

.price-label {
  font-size: 14px;
  color: #484848;
}

.price-value {
  font-size: 14px;
  font-weight: 500;
  color: #222222;
}

.price-offered {
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
}

.price-line--total .price-label,
.price-line--total .price-value {
  font-size: 16px;
  font-weight: 700;
  color: #222222;
}

/* Avertissement prix */
.price-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 12px;
  margin-bottom: 16px;
}

.price-warning-text {
  flex: 1;
}

.price-warning-text strong {
  display: block;
  font-size: 14px;
  color: #92400e;
  margin-bottom: 4px;
}

.price-warning-text p {
  font-size: 13px;
  color: #78350f;
  margin: 0;
}

.price-warning-btn {
  padding: 8px 16px;
  background-color: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s;
}

.price-warning-btn:hover:not(:disabled) {
  background-color: #d97706;
}

.price-warning-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Detail tarifaire */
.price-breakdown {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.breakdown-title {
  font-size: 13px;
  font-weight: 600;
  color: #0369a1;
  margin: 0 0 8px;
}

.breakdown-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #0c4a6e;
  padding: 4px 0;
}

.breakdown-note {
  font-size: 12px;
  color: #0369a1;
  font-style: italic;
  margin: 6px 0 0;
}

/* Echeances */
.payment-schedule {
  background-color: #fff8e6;
  border-radius: 12px;
  padding: 16px;
}

.schedule-title {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 12px 0;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.schedule-label {
  font-size: 14px;
  color: #78350f;
}

.schedule-value {
  font-size: 14px;
  font-weight: 500;
  color: #78350f;
}

.schedule-item--deposit {
  border-top: 1px solid #fcd34d;
  margin-top: 8px;
  padding-top: 12px;
}

/* Documents */
.documents-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.document-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background-color: #f7f7f7;
  border: 2px dashed #d4d4d4;
  border-radius: 12px;
  cursor: not-allowed;
  transition: all 0.2s;
}

.document-btn:disabled {
  opacity: 0.6;
}

.document-btn--active {
  background-color: #fff0f3;
  border: 2px solid #ff385c;
  cursor: pointer;
}

.document-btn--active:hover:not(:disabled) {
  background-color: #ffe4e9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 56, 92, 0.2);
}

.document-btn--active:active:not(:disabled) {
  transform: translateY(0);
}

.document-btn--active .document-icon {
  color: #ff385c;
}

.document-icon {
  width: 28px;
  height: 28px;
  color: #717171;
}

.document-label {
  font-size: 14px;
  font-weight: 500;
  color: #484848;
  text-align: center;
}

.document-status {
  font-size: 12px;
  color: #a3a3a3;
}

.document-status--ready {
  color: #ff385c;
  font-weight: 500;
}

.document-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #ffe4e9;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Email - contact link style */
.contact-link--email {
  cursor: default;
}

/* Modified alert */
.modified-alert {
  padding: 12px 16px;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  color: #92400e;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
}

/* Success screen */
.success-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 20px;
}

.success-icon-large {
  width: 64px;
  height: 64px;
  color: #10b981;
  margin-bottom: 16px;
}

.success-icon-large svg {
  width: 100%;
  height: 100%;
}

.success-heading {
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
  margin: 0 0 20px 0;
}

.success-recap {
  text-align: left;
  width: 100%;
  max-width: 380px;
  background: #f0fdf4;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.success-recap p {
  margin: 6px 0;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.btn-back-to-booking {
  padding: 14px 28px;
  min-height: 48px;
  border: none;
  border-radius: 10px;
  background: #10b981;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-back-to-booking:hover {
  background: #059669;
}

/* Email send buttons */
.email-warning {
  padding: 10px 14px;
  background-color: #fef2f2;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  margin-top: 12px;
}

.email-send-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.email-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  min-height: 48px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.email-btn:hover:not(:disabled) {
  background: #f0f9ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.email-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.email-btn--both {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
  font-weight: 600;
}

.email-btn--both:hover:not(:disabled) {
  background: #dbeafe;
}

.email-btn-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Email history */
.email-history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.show-all-emails-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 16px;
  margin-top: 12px;
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #717171;
  cursor: pointer;
  transition: all 0.15s;
}

.show-all-emails-btn:hover {
  background-color: #f7f7f7;
  border-color: #d4d4d4;
  color: #484848;
}

/* Actions card */
.actions-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  border: 2px solid transparent;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 52px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 20px;
  height: 20px;
}

/* Bouton principal - outline primary, pleine largeur */
.action-btn--primary {
  border-color: #ff385c;
  color: #ff385c;
  font-size: 16px;
  min-height: 56px;
}

.action-btn--primary:hover:not(:disabled) {
  background-color: #fff0f3;
  border-color: #e0314f;
  color: #e0314f;
}

.action-btn--primary:active:not(:disabled) {
  background-color: #ffe4e9;
}

/* Bouton confirmer - outline vert */
.action-btn--confirm {
  border-color: #10b981;
  color: #059669;
}

.action-btn--confirm:hover:not(:disabled) {
  background-color: #ecfdf5;
  border-color: #059669;
}

/* Bouton annuler - outline gris neutre */
.action-btn--cancel {
  border-color: #d4d4d4;
  color: #717171;
}

.action-btn--cancel:hover:not(:disabled) {
  background-color: #f7f7f7;
  border-color: #a3a3a3;
  color: #484848;
}

/* Bouton danger - discret */
.action-btn--delete {
  background-color: transparent;
  color: #9ca3af;
  border-color: transparent;
  font-size: 14px;
  font-weight: 500;
  min-height: 44px;
  padding: 10px 16px;
}

.action-btn--delete:hover:not(:disabled) {
  background-color: #fef2f2;
  color: #dc2626;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background-color: white;
  border-radius: 20px;
  padding: 28px;
  max-width: 360px;
  width: 100%;
  text-align: center;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 12px 0;
}

.modal-text {
  font-size: 15px;
  color: #dc2626;
  margin: 0 0 24px 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn--cancel {
  background-color: #f3f4f6;
  color: #484848;
}

.modal-btn--cancel:hover {
  background-color: #e5e5e5;
}

.modal-btn--confirm {
  background-color: #dc2626;
  color: white;
}

.modal-btn--confirm:hover:not(:disabled) {
  background-color: #b91c1c;
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

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-content {
  transform: scale(0.95);
}

.modal-leave-to .modal-content {
  transform: scale(0.95);
}

@media (min-width: 768px) {
  .success-toast {
    top: 32px;
  }
}

/* Desktop: Layout 2 colonnes */
@media (min-width: 1024px) {
  .booking-detail {
    max-width: 100%;
  }

  .detail-header {
    max-width: 100%;
  }

  .detail-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
  }

  .detail-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .detail-section {
    margin-bottom: 0;
  }

  /* Email history: scroll on desktop */
  .email-history-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .email-history-list::-webkit-scrollbar {
    width: 6px;
  }

  .email-history-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .email-history-list::-webkit-scrollbar-thumb {
    background-color: #d4d4d4;
    border-radius: 3px;
  }

  .email-history-list::-webkit-scrollbar-thumb:hover {
    background-color: #a3a3a3;
  }

  /* Show all button hidden on desktop (scroll handles it) */
  .show-all-emails-btn {
    display: none;
  }
}

/* Desktop: Large */
@media (min-width: 1200px) {
  .detail-columns {
    gap: 32px;
  }
}
</style>
