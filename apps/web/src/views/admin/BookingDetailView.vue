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
import { countNights, formatDateLong } from '../../utils/formatting';
import BookingEditModal from '../../components/admin/BookingEditModal.vue';
import QuickBookingEditModal from '../../components/admin/QuickBookingEditModal.vue';
import EmailSendModal from '../../components/admin/EmailSendModal.vue';
import ActionCard from '../../components/admin/ActionCard.vue';
import BookingNotesSection from '../../components/admin/BookingNotesSection.vue';
import BookingClientSection from '../../components/admin/BookingClientSection.vue';
import BookingPricingSection from '../../components/admin/BookingPricingSection.vue';
import BookingDocumentsSection from '../../components/admin/BookingDocumentsSection.vue';
import * as capabilities from '../../utils/bookingCapabilities';

const route = useRoute();
const router = useRouter();

const booking = ref<Booking | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const showEditModal = ref(false);
const showQuickEditModal = ref(false);
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
  return countNights(booking.value.startDate, booking.value.endDate);
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
      return 'Confirmée';
    case 'PENDING':
      return 'En attente';
    case 'CANCELLED':
      return 'Annulée';
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

const visibleEmailLogs = computed((): EmailLog[] => {
  if (showAllEmails.value) return emailLogs.value;
  return emailLogs.value.slice(0, 2);
});

const modifiedSinceLastSend = computed((): boolean => {
  if (!booking.value || emailLogs.value.length === 0) return false;
  const lastLog = emailLogs.value[0]; // Sorted by sentAt desc
  return new Date(booking.value.updatedAt) > new Date(lastLog.sentAt);
});

// Adaptive display helpers (Story 2.2)
const hasClient = computed((): boolean => {
  return !!booking.value?.primaryClient;
});

const hasRentalPrice = computed((): boolean => {
  return booking.value?.rentalPrice != null;
});

const hasExternalAmount = computed((): boolean => {
  return booking.value?.externalAmount != null;
});

const hasNotes = computed((): boolean => {
  return !!booking.value?.notes;
});

const isQuickBooking = computed((): boolean => {
  return booking.value ? capabilities.isQuickBooking(booking.value) : false;
});

const displayName = computed((): string | null => {
  if (booking.value?.primaryClient) {
    return capabilities.formatClientName(booking.value.primaryClient);
  }
  return booking.value?.label ?? null;
});

const sourceDisplayName = computed((): string => {
  if (!booking.value) return 'la plateforme';
  const name = capabilities.getSourceDisplayName(booking.value);
  return name === 'Direct' ? 'la plateforme' : name;
});

const isFullyEnriched = computed((): boolean => {
  return booking.value ? capabilities.canGenerateContract(booking.value) : false;
});

const canGenerateContract = computed((): boolean => {
  return booking.value ? capabilities.canGenerateContract(booking.value) : false;
});

const canGenerateInvoice = computed((): boolean => {
  return booking.value ? capabilities.canGenerateInvoice(booking.value) : false;
});

const canSendEmailComputed = computed((): boolean => {
  return booking.value ? capabilities.canSendEmail(booking.value) : false;
});

const contractDisabledReason = computed((): string | null => {
  return booking.value ? capabilities.getDisabledReason(booking.value, 'contract') : null;
});

const invoiceDisabledReason = computed((): string | null => {
  return booking.value ? capabilities.getDisabledReason(booking.value, 'invoice') : null;
});

const emailDisabledReason = computed((): string | null => {
  return booking.value ? capabilities.getDisabledReason(booking.value, 'email') : null;
});

const contractEmailReason = computed((): string | null => {
  if (!booking.value) return null;
  if (!capabilities.canSendEmail(booking.value)) return emailDisabledReason.value;
  if (!capabilities.canGenerateContract(booking.value)) return contractDisabledReason.value;
  return null;
});

const invoiceEmailReason = computed((): string | null => {
  if (!booking.value) return null;
  if (!capabilities.canSendEmail(booking.value)) return emailDisabledReason.value;
  if (!capabilities.canGenerateInvoice(booking.value)) return invoiceDisabledReason.value;
  return null;
});

const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const fetchBooking = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    booking.value = await bookingsApi.getById(bookingId.value);
  } catch (err: unknown) {
    console.error('Erreur lors du chargement de la réservation:', err);
    error.value = 'Impossible de charger la réservation. Veuillez réessayer.';
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
    showSuccess('Prix mis à jour !');
  } catch {
    error.value = 'Impossible de mettre à jour le prix.';
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
    showSuccess('Réservation confirmée !');
  } catch (err: unknown) {
    console.error('Erreur lors de la confirmation:', err);
    error.value = 'Impossible de confirmer la réservation. Veuillez réessayer.';
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
    showSuccess('Réservation annulée.');
  } catch (err: unknown) {
    console.error("Erreur lors de l'annulation:", err);
    error.value = "Impossible d'annuler la réservation. Veuillez réessayer.";
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
    showSuccess('Réservation supprimée.');
    setTimeout(() => {
      router.push('/admin/reservations');
    }, 1500);
  } catch (err: unknown) {
    console.error('Erreur lors de la suppression:', err);
    error.value = 'Impossible de supprimer la réservation. Veuillez réessayer.';
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
  if (isQuickBooking.value) {
    showQuickEditModal.value = true;
  } else {
    showEditModal.value = true;
  }
};

const handleBookingUpdated = async (updatedBooking: Booking): Promise<void> => {
  booking.value = updatedBooking;
  showEditModal.value = false;
  showQuickEditModal.value = false;
  showSuccess('Réservation modifiée !');
  await fetchBooking();
};

const handleGenerateContract = async (): Promise<void> => {
  if (!booking.value || !canGenerateContract.value) return;

  try {
    generatingContract.value = true;
    error.value = null;
    await pdfApi.downloadContract(booking.value.id);
    showSuccess('Contrat téléchargé !');
  } catch (err: unknown) {
    console.error('Erreur lors de la génération du contrat:', err);
    error.value = 'Impossible de générer le contrat. Veuillez réessayer.';
  } finally {
    generatingContract.value = false;
  }
};

const handleGenerateInvoice = async (): Promise<void> => {
  if (!booking.value || !canGenerateInvoice.value) return;

  try {
    generatingInvoice.value = true;
    error.value = null;
    await pdfApi.downloadInvoice(booking.value.id);
    showSuccess('Facture téléchargée !');
  } catch (err: unknown) {
    console.error('Erreur lors de la génération de la facture:', err);
    error.value = 'Impossible de générer la facture. Veuillez réessayer.';
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

const handleNotesUpdated = (updatedBooking: Booking): void => {
  booking.value = updatedBooking;
  showSuccess('Notes enregistrées');
};

onMounted(async () => {
  await fetchBooking();
  const tasks: Promise<void>[] = [fetchEmailHistory()];
  if (booking.value?.rentalPrice != null) {
    tasks.push(checkPriceConsistency());
  }
  await Promise.all(tasks);
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
      Retour aux réservations
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
      <p>Chargement de la réservation...</p>
    </div>

    <!-- Contenu -->
    <template v-else-if="booking">
      <!-- En-tete avec statut -->
      <div class="detail-header" :class="statusClass">
        <div class="header-top">
          <div class="header-left">
            <h1 class="detail-title">
              {{ displayName ?? `${formatShortDate(booking.startDate)} – ${formatShortDate(booking.endDate)}` }}
            </h1>
            <p class="detail-subtitle">
              <span class="header-source">{{ sourceDisplayName }}</span>
              <span class="header-sep">·</span>
              <span>{{ formatShortDate(booking.startDate) }} – {{ formatShortDate(booking.endDate) }}</span>
              <span class="header-sep">·</span>
              <span>{{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}</span>
            </p>
          </div>
          <div class="header-right">
            <span class="status-text" :class="`status-text--${booking.status?.toLowerCase()}`">
              {{ statusLabel }}
            </span>
            <span class="booking-id">{{ booking.id.slice(0, 8) }}</span>
          </div>
        </div>
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
              Dates du séjour
            </h2>
            <div class="dates-grid">
              <div class="date-card">
                <span class="date-label">Arrivée</span>
                <span class="date-value">{{ formatDateLong(booking.startDate) }}</span>
                <span class="date-time">À partir de 16h00</span>
              </div>
              <div class="date-card">
                <span class="date-label">Départ</span>
                <span class="date-value">{{ formatDateLong(booking.endDate) }}</span>
                <span class="date-time">Avant 11h00</span>
              </div>
            </div>
          </section>

          <!-- Occupants standalone (quick booking sans client) -->
          <div v-if="!hasClient && booking.occupantsCount" class="standalone-occupants">
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
              >{{ booking.occupantsCount }} personne{{
                booking.occupantsCount > 1 ? 's' : ''
              }}</span
            >
          </div>

          <!-- Section Notes (all booking types) -->
          <BookingNotesSection
            :booking="booking"
            :has-notes="hasNotes"
            @notes-updated="handleNotesUpdated"
            @save-error="(msg) => (error = msg)"
          />

          <!-- Section Client -->
          <BookingClientSection v-if="hasClient" :booking="booking" />

          <!-- Section Tarifs (adaptive) -->
          <BookingPricingSection
            :booking="booking"
            :nights-count="nightsCount"
            :has-rental-price="hasRentalPrice"
            :has-external-amount="hasExternalAmount"
            :source-display-name="sourceDisplayName"
            :cleaning-price="cleaningPrice"
            :linen-price="linenPrice"
            :tourist-tax-price="touristTaxPrice"
            :total-price="totalPrice"
            :deposit-amount="depositAmount"
            :balance-amount="balanceAmount"
            :price-calculation="priceCalculation"
            :price-mismatch="priceMismatch"
            :loading="loading"
            @update-price="handleUpdatePrice"
          />
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
                Modifier la réservation
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

          <!-- ActionCard pair for quick bookings (hidden when CANCELLED — FR28) -->
          <div v-if="isQuickBooking && booking.status !== 'CANCELLED'" class="action-cards-pair">
            <ActionCard
              :icon="'<path d=&quot;M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7&quot; /><path d=&quot;M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z&quot; />'"
              title="Modifier"
              description="Modifier les informations de la réservation"
              variant="outline"
              @click="handleOpenEdit"
            />
            <ActionCard
              v-if="!isFullyEnriched"
              :icon="'<path d=&quot;M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z&quot; /><path d=&quot;M12 8v4&quot; /><path d=&quot;M12 16h.01&quot; />'"
              title="Compléter les informations"
              description="Ajouter client, tarification et options"
              variant="primary"
              @click="router.push(`/admin/reservations/${bookingId}/enrichir`)"
            />
            <div v-else class="enriched-badge">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="enriched-badge__icon"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Informations complètes</span>
            </div>
          </div>

          <!-- Section Documents + Email History -->
          <BookingDocumentsSection
            :booking="booking"
            :can-generate-contract="canGenerateContract"
            :can-generate-invoice="canGenerateInvoice"
            :can-send-email="canSendEmailComputed"
            :contract-disabled-reason="contractDisabledReason"
            :invoice-disabled-reason="invoiceDisabledReason"
            :contract-email-reason="contractEmailReason"
            :invoice-email-reason="invoiceEmailReason"
            :generating-contract="generatingContract"
            :generating-invoice="generatingInvoice"
            :modified-since-last-send="modifiedSinceLastSend"
            :show-success-screen="showSuccessScreen"
            :last-sent-email="lastSentEmail"
            :email-logs="emailLogs"
            :visible-email-logs="visibleEmailLogs"
            :show-all-emails="showAllEmails"
            @generate-contract="handleGenerateContract"
            @generate-invoice="handleGenerateInvoice"
            @send-contract-email="openEmailModal(['contract'])"
            @send-invoice-email="openEmailModal(['invoice'])"
            @send-both-email="openEmailModal(['contract', 'invoice'])"
            @dismiss-success="dismissSuccessScreen"
            @toggle-show-all-emails="showAllEmails = true"
            @resend-email="handleResend"
          />
        </div>
      </div>
    </template>

    <!-- Modal de confirmation suppression -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal-content">
            <h3 class="modal-title">Supprimer cette réservation ?</h3>
            <p class="modal-text">Cette action est irréversible.</p>
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

    <!-- Modal de modification (DIRECT bookings) -->
    <BookingEditModal
      v-if="showEditModal && booking"
      :booking="booking"
      :booked-dates="bookedDates"
      @close="showEditModal = false"
      @updated="handleBookingUpdated"
    />

    <!-- Modal de modification (Quick bookings: EXTERNAL/PERSONAL) -->
    <QuickBookingEditModal
      v-if="showQuickEditModal && booking"
      :booking="booking"
      @close="showQuickEditModal = false"
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
  padding: 24px 24px 24px 28px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebebeb;
  border-left: 4px solid #d4d4d4;
}

.detail-header.status--confirmed {
  border-left-color: #10b981;
}

.detail-header.status--pending {
  border-left-color: #f59e0b;
}

.detail-header.status--cancelled {
  border-left-color: #d4d4d4;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-left {
  min-width: 0;
  flex: 1;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.status-text {
  font-size: 13px;
  font-weight: 600;
}

.status-text--confirmed {
  color: #059669;
}

.status-text--pending {
  color: #d97706;
}

.status-text--cancelled {
  color: #9ca3af;
}

.booking-id {
  font-size: 12px;
  color: #9ca3af;
  font-family: monospace;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 6px 0;
  line-height: 1.3;
}

.detail-subtitle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #717171;
  margin: 0;
}

.header-source {
  font-weight: 600;
  color: #484848;
}

.header-sep {
  color: #d4d4d4;
}

/* Standalone occupants (quick booking without client) */
.standalone-occupants {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #f9f9f9;
  border-radius: 12px;
  font-size: 15px;
  color: #484848;
  margin-bottom: 16px;
}

/* Sections */
.detail-section {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebebeb;
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

.occupants-icon {
  width: 18px;
  height: 18px;
  color: #717171;
}

/* Action Cards Pair */
.action-cards-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.enriched-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 20px;
  border-radius: 16px;
  border: 2px solid #d1fae5;
  background: #ecfdf5;
  color: #059669;
  font-weight: 600;
  font-size: 16px;
}

.enriched-badge__icon {
  width: 32px;
  height: 32px;
}

@media (max-width: 480px) {
  .action-cards-pair {
    grid-template-columns: 1fr;
  }
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
}

/* Desktop: Large */
@media (min-width: 1200px) {
  .detail-columns {
    gap: 32px;
  }
}
</style>
