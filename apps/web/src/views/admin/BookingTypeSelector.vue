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
  <div class="mx-auto max-w-xl px-4 py-8">
    <!-- Back link -->
    <router-link
      to="/admin/reservations"
      class="mb-6 inline-flex items-center gap-1 text-sm text-text hover:text-primary"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
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
    <h1 class="mb-2 text-2xl font-bold text-dark">Nouvelle réservation</h1>
    <p class="mb-8 text-sm text-text">Choisissez le type de réservation à créer</p>

    <!-- Type selector rows -->
    <div class="flex flex-col gap-4">
      <TypeSelectorRow
        title="Réservation directe"
        description="Créer une réservation complète avec contrat et facture"
        detail="6 étapes — Client + tarification"
        @click="goToDirect"
      >
        <template #icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 text-gray-600"
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
            class="h-6 w-6 text-gray-600"
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
</template>
