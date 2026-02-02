<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { bookingsApi, type Booking } from '../../lib/api';
import BookingCard from '../../components/admin/BookingCard.vue';

const bookings = ref<Booking[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const filter = ref<'upcoming' | 'past'>('upcoming');
const loadingBookingId = ref<string | null>(null);
const loadingAction = ref<'confirm' | 'cancel' | 'delete' | null>(null);

const filteredBookings = computed((): Booking[] => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return bookings.value.filter((booking) => {
    const endDate = new Date(booking.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (filter.value === 'upcoming') {
      return endDate >= now;
    } else {
      return endDate < now;
    }
  });
});

const sortedBookings = computed((): Booking[] => {
  return [...filteredBookings.value].sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return filter.value === 'upcoming' ? dateA - dateB : dateB - dateA;
  });
});

// Statistiques pour le header desktop
const stats = computed(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = bookings.value.filter((b) => new Date(b.endDate) >= now);
  const pending = upcoming.filter((b) => b.status === 'PENDING');
  const confirmed = upcoming.filter((b) => b.status === 'CONFIRMED');

  return {
    total: upcoming.length,
    pending: pending.length,
    confirmed: confirmed.length,
  };
});

const fetchBookings = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    const data = await bookingsApi.getAll();
    bookings.value = data;
  } catch (err) {
    console.error('Erreur lors du chargement des réservations:', err);
    error.value = 'Impossible de charger les réservations. Veuillez réessayer.';
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

const handleConfirm = async (id: string): Promise<void> => {
  try {
    loading.value = true;
    loadingBookingId.value = id;
    loadingAction.value = 'confirm';
    error.value = null;
    await bookingsApi.confirm(id);
    await fetchBookings();
    showSuccess('Reservation confirmee !');
  } catch (err) {
    console.error('Erreur lors de la confirmation:', err);
    error.value = 'Impossible de confirmer la reservation. Veuillez reessayer.';
  } finally {
    loading.value = false;
    loadingBookingId.value = null;
    loadingAction.value = null;
  }
};

const handleCancel = async (id: string): Promise<void> => {
  try {
    loading.value = true;
    loadingBookingId.value = id;
    loadingAction.value = 'cancel';
    error.value = null;
    await bookingsApi.cancel(id);
    await fetchBookings();
    showSuccess('Reservation annulee.');
  } catch (err) {
    console.error("Erreur lors de l'annulation:", err);
    error.value = "Impossible d'annuler la reservation. Veuillez reessayer.";
  } finally {
    loading.value = false;
    loadingBookingId.value = null;
    loadingAction.value = null;
  }
};

const handleDelete = async (id: string): Promise<void> => {
  try {
    loading.value = true;
    loadingBookingId.value = id;
    loadingAction.value = 'delete';
    error.value = null;
    await bookingsApi.delete(id);
    await fetchBookings();
    showSuccess('Reservation supprimee.');
  } catch (err) {
    console.error('Erreur lors de la suppression:', err);
    error.value = 'Impossible de supprimer la reservation. Veuillez reessayer.';
  } finally {
    loading.value = false;
    loadingBookingId.value = null;
    loadingAction.value = null;
  }
};

onMounted(() => {
  void fetchBookings();
});
</script>

<template>
  <div class="bookings-view">
    <!-- Message de succès -->
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

    <!-- Header statistiques desktop -->
    <div class="stats-header">
      <div class="stat-card stat-card--total">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">À venir</span>
      </div>
      <div class="stat-card stat-card--pending">
        <span class="stat-value">{{ stats.pending }}</span>
        <span class="stat-label">En attente</span>
      </div>
      <div class="stat-card stat-card--confirmed">
        <span class="stat-value">{{ stats.confirmed }}</span>
        <span class="stat-label">Confirmées</span>
      </div>
    </div>

    <!-- Filtres -->
    <div class="filter-bar">
      <button
        class="filter-btn"
        :class="{ 'filter-btn--active': filter === 'upcoming' }"
        @click="filter = 'upcoming'"
      >
        À venir
        <span class="filter-count">{{ stats.total }}</span>
      </button>
      <button
        class="filter-btn"
        :class="{ 'filter-btn--active': filter === 'past' }"
        @click="filter = 'past'"
      >
        Passées
        <span class="filter-count">{{ bookings.length - stats.total }}</span>
      </button>
    </div>

    <!-- Chargement -->
    <div v-if="loading && bookings.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des réservations...</p>
    </div>

    <!-- Liste vide -->
    <div v-else-if="sortedBookings.length === 0" class="empty-state">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <p class="empty-title">
        {{ filter === 'upcoming' ? 'Aucune réservation à venir' : 'Aucune réservation passée' }}
      </p>
      <p class="empty-subtitle">
        {{
          filter === 'upcoming'
            ? 'Les nouvelles réservations apparaîtront ici'
            : "L'historique des réservations apparaîtra ici"
        }}
      </p>
    </div>

    <!-- Liste des reservations -->
    <div v-else class="bookings-list">
      <BookingCard
        v-for="booking in sortedBookings"
        :key="booking.id"
        :booking="booking"
        :loading="loading && loadingBookingId === booking.id"
        :loading-action="loadingBookingId === booking.id ? loadingAction : null"
        @confirm="handleConfirm"
        @cancel="handleCancel"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.bookings-view {
  max-width: 600px;
  margin: 0 auto;
}

/* Header statistiques - masqué sur mobile */
.stats-header {
  display: none;
}

/* Toast de succès */
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

/* Bannière d'erreur */
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

.error-close:hover {
  background-color: #fecaca;
}

/* Barre de filtres */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  background-color: white;
  font-size: 15px;
  font-weight: 500;
  color: #717171;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 12px;
  background-color: #e5e5e5;
  font-size: 13px;
  font-weight: 600;
}

.filter-btn--active {
  border-color: #ff385c;
  background-color: #fff0f3;
  color: #ff385c;
}

.filter-btn--active .filter-count {
  background-color: #ff385c;
  color: white;
}

.filter-btn:not(.filter-btn--active):hover {
  border-color: #d4d4d4;
  background-color: #f7f7f7;
}

/* États */
.loading-state,
.empty-state {
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

.empty-icon {
  width: 64px;
  height: 64px;
  color: #d4d4d4;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #484848;
  margin: 0 0 8px 0;
}

.empty-subtitle {
  font-size: 15px;
  color: #717171;
  margin: 0;
}

/* Liste */
.bookings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

/* Desktop: Tablet */
@media (min-width: 768px) {
  .bookings-view {
    max-width: 100%;
  }

  .success-toast {
    top: 32px;
  }

  /* Header statistiques visible */
  .stats-header {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background-color: white;
    border-radius: 12px;
    border: 1px solid #e5e5e5;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
  }

  .stat-label {
    font-size: 13px;
    color: #717171;
    margin-top: 4px;
  }

  .stat-card--total .stat-value {
    color: #484848;
  }

  .stat-card--pending .stat-value {
    color: #f59e0b;
  }

  .stat-card--confirmed .stat-value {
    color: #10b981;
  }

  /* Filtres plus larges */
  .filter-bar {
    max-width: 400px;
  }

  .filter-btn {
    flex: none;
    padding: 12px 24px;
  }

  /* Grille 2 colonnes */
  .bookings-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

/* Desktop: Large */
@media (min-width: 1200px) {
  .stats-header {
    max-width: 600px;
  }

  /* Grille 3 colonnes */
  .bookings-list {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}
</style>
