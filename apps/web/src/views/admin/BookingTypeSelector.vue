<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goToDirect = (): void => {
  router.push({ name: 'AdminNewBookingDirect' });
};

const goToQuick = (): void => {
  router.push({ name: 'AdminQuickBookingStep1' });
};
</script>

<template>
  <div class="booking-type-selector">
    <!-- Back link -->
    <router-link to="/admin/reservations" class="back-link">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="back-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Retour aux réservations
    </router-link>

    <!-- Page header -->
    <h1 class="page-title">Nouvelle réservation</h1>
    <p class="page-description">Choisissez le type de réservation à créer</p>

    <!-- Type cards -->
    <div class="type-cards">
      <button class="type-card" @click="goToDirect">
        <div class="type-card__icon type-card__icon--direct">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div class="type-card__body">
          <span class="type-card__title">Réservation directe</span>
          <span class="type-card__desc">Créer une réservation complète avec contrat et facture</span>
          <span class="type-card__meta">6 étapes — Client + tarification</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="type-card__arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <button class="type-card" @click="goToQuick">
        <div class="type-card__icon type-card__icon--quick">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div class="type-card__body">
          <span class="type-card__title">Réservation rapide</span>
          <span class="type-card__desc">Bloquer des dates rapidement (Abritel, famille...)</span>
          <span class="type-card__meta">2 étapes — Dates + source</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="type-card__arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.booking-type-selector {
  max-width: 500px;
  margin: 0 auto;
  padding: 0 16px 40px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #484848;
  text-decoration: none;
  margin-bottom: 24px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #ff385c;
}

.back-icon {
  width: 16px;
  height: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 6px 0;
}

.page-description {
  font-size: 15px;
  color: #717171;
  margin: 0 0 28px 0;
}

/* ── Cards ── */
.type-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.type-card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px;
  border: 1px solid #ebebeb;
  border-radius: 16px;
  background-color: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.type-card:hover {
  border-color: #d4d4d4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04);
  transform: translateY(-1px);
}

.type-card:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.type-card:focus-visible {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.15);
}

/* ── Icon ── */
.type-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 14px;
}

.type-card__icon svg {
  width: 26px;
  height: 26px;
}

.type-card__icon--direct {
  background-color: #ecfdf5;
  color: #059669;
}

.type-card__icon--quick {
  background-color: #fff7ed;
  color: #d97706;
}

/* ── Body ── */
.type-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.type-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #222222;
}

.type-card__desc {
  font-size: 14px;
  color: #717171;
  line-height: 1.3;
}

.type-card__meta {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

/* ── Arrow ── */
.type-card__arrow {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #d4d4d4;
  transition: all 0.2s;
}

.type-card:hover .type-card__arrow {
  color: #717171;
  transform: translateX(2px);
}

@media (min-width: 768px) {
  .booking-type-selector {
    max-width: 560px;
  }

  .page-title {
    font-size: 26px;
  }

  .type-card {
    padding: 24px;
  }
}
</style>
