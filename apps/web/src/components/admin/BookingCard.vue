<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Booking } from '../../lib/api';
import { SOURCE_LABELS, PAYMENT_STATUS_LABELS } from '../../constants/booking';
import { countNights, formatPrice } from '../../utils/formatting';

interface Props {
  booking: Booking;
  loading?: boolean;
  loadingAction?: 'confirm' | 'cancel' | 'delete' | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingAction: null,
});

const emit = defineEmits<{
  confirm: [id: string];
  cancel: [id: string];
  delete: [id: string];
}>();

const router = useRouter();
const showDeleteConfirm = ref(false);

const goToDetail = (): void => {
  router.push({ name: 'AdminBookingDetail', params: { id: props.booking.id } });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const formatDateRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const endStr = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startStr} - ${endStr}`;
};

const nightsCount = computed((): number => {
  return countNights(props.booking.startDate, props.booking.endDate);
});

const clientName = computed((): string => {
  if (props.booking.primaryClient) {
    return `${props.booking.primaryClient.firstName} ${props.booking.primaryClient.lastName}`;
  }
  return props.booking.label ?? 'Sans nom';
});

const sourceLabel = computed((): string => {
  if (props.booking.bookingType === 'DIRECT') return 'Réservation directe';
  if (props.booking.source === 'OTHER' && props.booking.sourceCustomName) {
    return `via ${props.booking.sourceCustomName}`;
  }
  if (props.booking.source && props.booking.source in SOURCE_LABELS) {
    return `via ${SOURCE_LABELS[props.booking.source]}`;
  }
  if (props.booking.bookingType === 'PERSONAL') return 'Usage personnel';
  return 'Réservation directe';
});

const sourceDisplayName = computed((): string => {
  if (!props.booking.source) return 'la plateforme';
  if (props.booking.source === 'OTHER' && props.booking.sourceCustomName) {
    return props.booking.sourceCustomName;
  }
  return SOURCE_LABELS[props.booking.source] ?? 'la plateforme';
});

const paymentLabel = computed((): string | null => {
  if (!props.booking.paymentStatus) return null;
  const labels: Record<string, string> = {
    PENDING: 'Paiement en attente',
    PARTIAL: 'Paiement partiel',
    PAID: 'Payé',
    FREE: 'Gratuit',
  };
  return labels[props.booking.paymentStatus] ?? PAYMENT_STATUS_LABELS[props.booking.paymentStatus];
});

const paymentClass = computed((): string => {
  switch (props.booking.paymentStatus) {
    case 'PAID':
      return 'payment--paid';
    case 'FREE':
      return 'payment--free';
    default:
      return 'payment--pending';
  }
});

const statusModifier = computed((): string => {
  switch (props.booking.status) {
    case 'CONFIRMED':
      return 'booking-card--confirmed';
    case 'PENDING':
      return 'booking-card--pending';
    case 'CANCELLED':
      return 'booking-card--cancelled';
    default:
      return '';
  }
});

const handleConfirm = (): void => {
  emit('confirm', props.booking.id);
};

const handleCancel = (): void => {
  emit('cancel', props.booking.id);
};

const handleDelete = (): void => {
  showDeleteConfirm.value = false;
  emit('delete', props.booking.id);
};
</script>

<template>
  <div class="booking-card" :class="statusModifier">
    <!-- En-tête : nom client + nuits -->
    <div class="card-header">
      <div class="card-header-left">
        <span class="client-name">{{ clientName }}</span>
        <span class="source-text">{{ sourceLabel }}</span>
      </div>
      <span class="nights-badge">{{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}</span>
    </div>

    <!-- Dates -->
    <div class="card-dates">
      <div class="date-block">
        <span class="date-label">Arrivée</span>
        <span class="date-value">{{ formatDate(booking.startDate) }}</span>
      </div>
      <div class="date-arrow">
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
      </div>
      <div class="date-block">
        <span class="date-label">Départ</span>
        <span class="date-value">{{ formatDate(booking.endDate) }}</span>
      </div>
    </div>

    <!-- Infos : occupants + prix + paiement -->
    <div class="card-meta">
      <div class="meta-row">
        <span v-if="booking.occupantsCount" class="meta-item">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="meta-icon"
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
          {{ booking.occupantsCount }} pers.
        </span>
        <span v-if="booking.rentalPrice" class="meta-price">
          {{ formatPrice(Number(booking.rentalPrice ?? 0)) }}
        </span>
        <template v-else-if="booking.externalAmount != null">
          <span class="meta-price">
            {{ formatPrice(Number(booking.externalAmount ?? 0)) }}
          </span>
          <span class="meta-muted">reçu de {{ sourceDisplayName }}</span>
        </template>
      </div>
      <span v-if="paymentLabel" class="payment-text" :class="paymentClass">
        {{ paymentLabel }}
      </span>
    </div>

    <!-- Bouton détails -->
    <button class="detail-btn" @click="goToDetail">
      <span>Voir les détails</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="detail-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>

    <!-- Actions -->
    <div v-if="booking.status !== 'CANCELLED'" class="card-actions">
      <button
        v-if="booking.status === 'PENDING'"
        class="action-btn action-btn--confirm"
        :disabled="loading"
        @click="handleConfirm"
      >
        <span v-if="loadingAction === 'confirm'" class="btn-spinner btn-spinner--light"></span>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ loadingAction === 'confirm' ? 'Confirmation...' : 'Confirmer' }}
      </button>

      <button
        v-if="booking.status === 'PENDING'"
        class="action-btn action-btn--cancel"
        :disabled="loading"
        @click="handleCancel"
      >
        <span v-if="loadingAction === 'cancel'" class="btn-spinner"></span>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {{ loadingAction === 'cancel' ? 'Annulation...' : 'Annuler' }}
      </button>

      <button
        class="action-btn action-btn--delete"
        :disabled="loading"
        @click="showDeleteConfirm = true"
      >
        <span v-if="loadingAction === 'delete'" class="btn-spinner"></span>
        <svg
          v-else
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
        {{ loadingAction === 'delete' ? '...' : 'Supprimer' }}
      </button>
    </div>

    <!-- Modal de confirmation suppression -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal-content">
            <h3 class="modal-title">Supprimer cette réservation ?</h3>
            <p class="modal-text">{{ formatDateRange(booking.startDate, booking.endDate) }}</p>
            <p class="modal-warning">Cette action est irréversible.</p>
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
  </div>
</template>

<style scoped>
/* ── Carte ── */
.booking-card {
  background-color: white;
  border-radius: 16px;
  padding: 20px 20px 20px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebebeb;
  border-left: 4px solid #d4d4d4;
  transition: box-shadow 0.2s;
}

.booking-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06);
}

.booking-card--confirmed {
  border-left-color: #10b981;
}

.booking-card--pending {
  border-left-color: #f59e0b;
}

.booking-card--cancelled {
  border-left-color: #d4d4d4;
  opacity: 0.6;
}

/* ── En-tête ── */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.card-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.client-name {
  font-size: 17px;
  font-weight: 700;
  color: #222222;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-text {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 400;
}

.nights-badge {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: #717171;
  background-color: #f5f5f5;
  padding: 4px 10px;
  border-radius: 8px;
}

/* ── Dates ── */
.card-dates {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.date-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.date-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.date-value {
  font-size: 15px;
  font-weight: 600;
  color: #222222;
}

.date-arrow {
  color: #d4d4d4;
}

.date-arrow svg {
  width: 20px;
  height: 20px;
}

/* ── Infos ── */
.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 0 0;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #717171;
}

.meta-icon {
  width: 16px;
  height: 16px;
}

.meta-price {
  font-size: 16px;
  font-weight: 700;
  color: #222222;
}

.meta-muted {
  font-size: 12px;
  color: #9ca3af;
}

.payment-text {
  font-size: 13px;
  font-weight: 500;
}

.payment--pending {
  color: #d97706;
}

.payment--paid {
  color: #059669;
}

.payment--free {
  color: #9ca3af;
}

/* ── Bouton détails ── */
.detail-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  margin-top: 14px;
  background-color: #f7f7f7;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #484848;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-btn:hover {
  background-color: #fff0f3;
  color: #ff385c;
}

.detail-icon {
  width: 16px;
  height: 16px;
}

/* ── Actions ── */
.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.btn-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-spinner--light {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.action-btn--confirm {
  background-color: #10b981;
  color: white;
}

.action-btn--confirm:hover:not(:disabled) {
  background-color: #059669;
}

.action-btn--cancel {
  background-color: #f3f4f6;
  color: #6b7280;
}

.action-btn--cancel:hover:not(:disabled) {
  background-color: #e5e7eb;
  color: #484848;
}

.action-btn--delete {
  background-color: transparent;
  color: #d1d5db;
  margin-left: auto;
}

.action-btn--delete:hover:not(:disabled) {
  background-color: #fef2f2;
  color: #ef4444;
}

/* ── Modal ── */
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
  font-size: 16px;
  color: #484848;
  margin: 0 0 8px 0;
}

.modal-warning {
  font-size: 14px;
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

.modal-btn--confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Transitions modal ── */
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

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
