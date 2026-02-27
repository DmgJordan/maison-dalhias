<script setup lang="ts">
import { useRouter } from 'vue-router';
import TypeSelectorRow from '../../components/admin/TypeSelectorRow.vue';

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

    <!-- Type selector card -->
    <div class="step-content">
      <div class="type-list">
        <TypeSelectorRow
          title="Réservation directe"
          description="Créer une réservation complète avec contrat et facture"
          detail="6 étapes — Client + tarification"
          @click="goToDirect"
        >
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="type-icon"
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
          </template>
        </TypeSelectorRow>

        <TypeSelectorRow
          title="Réservation rapide"
          description="Bloquer des dates rapidement (Abritel, famille...)"
          detail="2 étapes — Dates + source"
          @click="goToQuick"
        >
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="type-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </template>
        </TypeSelectorRow>
      </div>
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
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 14px;
  color: #717171;
  margin: 0 0 24px 0;
}

.step-content {
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-icon {
  width: 24px;
  height: 24px;
  color: #484848;
}

@media (min-width: 768px) {
  .booking-type-selector {
    max-width: 600px;
  }
}

@media (min-width: 1024px) {
  .booking-type-selector {
    max-width: 700px;
  }

  .page-title {
    font-size: 24px;
  }

  .step-content {
    padding: 32px;
  }
}
</style>
