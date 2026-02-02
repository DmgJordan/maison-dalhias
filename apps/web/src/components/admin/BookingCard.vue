<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Booking } from '../../lib/api';

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
  router.push(`/admin/reservations/${props.booking.id}`);
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

  const startStr = startDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

  const endStr = endDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${startStr} - ${endStr}`;
};

const nightsCount = computed((): number => {
  const start = new Date(props.booking.startDate);
  const end = new Date(props.booking.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const statusLabel = computed((): string => {
  switch (props.booking.status) {
    case 'CONFIRMED':
      return 'Confirmée';
    case 'PENDING':
      return 'En attente';
    case 'CANCELLED':
      return 'Annulée';
    default:
      return props.booking.status;
  }
});

const statusClass = computed((): string => {
  switch (props.booking.status) {
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

const formatPrice = (price: number | string | undefined): string => {
  if (!price) return '-';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(numPrice);
};
</script>

<template>
  <div class="booking-card" :class="{ 'booking-card--cancelled': booking.status === 'CANCELLED' }">
    <!-- En-tête avec statut -->
    <div class="card-header">
      <span class="status-badge" :class="statusClass">
        {{ statusLabel }}
      </span>
      <span class="nights-count">{{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}</span>
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

    <!-- Informations -->
    <div class="card-info">
      <div v-if="booking.occupantsCount" class="info-item">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="info-icon"
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
          >{{ booking.occupantsCount }} personne{{ booking.occupantsCount > 1 ? 's' : '' }}</span
        >
      </div>
      <div v-if="booking.rentalPrice" class="info-item info-item--price">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="info-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span>{{ formatPrice(booking.rentalPrice) }}</span>
      </div>
    </div>

    <!-- Bouton voir details -->
    <button class="detail-btn" @click="goToDetail">
      <span>Voir les details</span>
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
          stroke-width="2"
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
        <span v-if="loadingAction === 'cancel'" class="btn-spinner btn-spinner--light"></span>
        <svg
          v-else
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
        {{ loadingAction === 'delete' ? 'Suppression...' : 'Supprimer' }}
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
.booking-card {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.booking-card--cancelled {
  opacity: 0.7;
  background-color: #f9f9f9;
}

/* En-tête */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.status--confirmed {
  background-color: #d1fae5;
  color: #059669;
}

.status--pending {
  background-color: #fef3c7;
  color: #92400e; /* Darker for better contrast */
}

.status--cancelled {
  background-color: #fee2e2;
  color: #dc2626;
}

.nights-count {
  font-size: 14px;
  color: #717171;
  font-weight: 500;
}

/* Dates */
.card-dates {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.date-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label {
  font-size: 12px;
  color: #717171;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-value {
  font-size: 16px;
  font-weight: 600;
  color: #222222;
}

.date-arrow {
  color: #d4d4d4;
}

.date-arrow svg {
  width: 24px;
  height: 24px;
}

/* Informations */
.card-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #484848;
}

.info-icon {
  width: 18px;
  height: 18px;
  color: #717171;
}

.info-item--price {
  font-weight: 600;
  color: #222222;
}

/* Bouton details */
.detail-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  margin-top: 16px;
  background-color: #f7f7f7;
  border: none;
  border-radius: 12px;
  font-size: 15px;
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
  width: 18px;
  height: 18px;
}

/* Actions */
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(30%);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-top-color: #6b7280;
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
  background-color: #f59e0b;
  color: white;
}

.action-btn--cancel:hover:not(:disabled) {
  background-color: #d97706;
}

.action-btn--delete {
  background-color: #f3f4f6;
  color: #6b7280;
}

.action-btn--delete:hover:not(:disabled) {
  background-color: #fee2e2;
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

/* Transitions modal */
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
</style>
