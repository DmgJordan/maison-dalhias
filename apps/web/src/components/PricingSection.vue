<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { pricingApi, type PublicPricingGrid } from '@/lib/api';
import { INCLUDED_SERVICES, TARIFS, LOGEMENT } from '@/constants/property';

const loading = ref(true);
const error = ref<string | null>(null);
const pricingGrid = ref<PublicPricingGrid | null>(null);

// Grouper les périodes par saison pour regrouper les dates
interface GroupedPeriod {
  seasonName: string;
  dates: string[];
  pricePerNight: number;
  weeklyPrice: number;
  minNights: number;
  color: string | null;
}

const groupedPeriods = computed((): GroupedPeriod[] => {
  if (!pricingGrid.value) return [];

  const groups = new Map<string, GroupedPeriod>();

  for (const period of pricingGrid.value.periods) {
    const key = period.seasonName;
    const dateRange = formatDateRange(period.startDate, period.endDate);

    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.dates.push(dateRange);
    } else {
      groups.set(key, {
        seasonName: period.seasonName,
        dates: [dateRange],
        pricePerNight: period.pricePerNight,
        weeklyPrice: period.weeklyPrice,
        minNights: period.minNights,
        color: period.color,
      });
    }
  }

  return Array.from(groups.values());
});

const formatDateRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const formatDate = (d: Date): string => {
    const day = d.getDate();
    const months = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];
    return `${day} ${months[d.getMonth()]}`;
  };

  return `Du ${formatDate(startDate)} au ${formatDate(endDate)}`;
};

const fetchPricing = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;

    // Déterminer l'année à afficher
    const now = new Date();
    const currentYear = now.getFullYear();
    // Si après octobre, on peut proposer l'année suivante
    const year = now.getMonth() >= 9 ? currentYear + 1 : currentYear;

    pricingGrid.value = await pricingApi.getPublicGrid(year);
  } catch (e) {
    console.error('Erreur lors du chargement des tarifs:', e);
    error.value = 'Impossible de charger les tarifs. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void fetchPricing();
});
</script>

<template>
  <div class="min-h-screen py-16 bg-background">
    <div class="container-custom">
      <h1 class="text-4xl font-bold text-center text-dark mb-4">Tarifs de la Maison Dalhia 19</h1>
      <p class="text-center text-text/80 mb-12">
        Située dans le Domaine du Rouret - Pierre & Vacances
      </p>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700"
      >
        {{ error }}
        <button class="mt-4 px-4 py-2 bg-primary text-white rounded-lg" @click="fetchPricing">
          Réessayer
        </button>
      </div>

      <!-- Content -->
      <template v-else-if="pricingGrid && groupedPeriods.length > 0">
        <!-- Année affichée -->
        <p class="text-center text-lg font-semibold text-primary mb-8">
          Tarifs {{ pricingGrid.year }}
        </p>

        <!-- Version mobile -->
        <div class="lg:hidden space-y-4">
          <div
            v-for="period in groupedPeriods"
            :key="period.seasonName"
            class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div class="flex items-start justify-between mb-2">
              <h2 class="text-xl font-semibold text-dark">{{ period.seasonName }}</h2>
              <span
                v-if="period.minNights > 3"
                class="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full"
              >
                Min {{ period.minNights }} nuits
              </span>
            </div>
            <div class="text-sm text-text/60 mb-4">
              <p v-for="date in period.dates" :key="date">{{ date }}</p>
            </div>
            <div class="flex justify-between items-center mb-4">
              <div>
                <div class="text-2xl font-bold text-primary">{{ period.pricePerNight }}€</div>
                <div class="text-sm text-text/60">par nuit</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-primary">{{ period.weeklyPrice }}€</div>
                <div class="text-sm text-text/60">par semaine</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Version desktop -->
        <div class="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-lg">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-900">Période</th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-900">Dates</th>
                <th class="px-6 py-4 text-right text-sm font-semibold text-gray-900">Prix/Nuit</th>
                <th class="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Prix/Semaine
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="period in groupedPeriods"
                :key="period.seasonName"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">{{ period.seasonName }}</div>
                  <span
                    v-if="period.minNights > 3"
                    class="inline-block mt-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full"
                  >
                    Min {{ period.minNights }} nuits
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  <div v-for="date in period.dates" :key="date">{{ date }}</div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="font-medium text-primary">{{ period.pricePerNight }}€</div>
                  <div class="text-xs text-gray-500">par nuit</div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="font-medium text-primary">{{ period.weeklyPrice }}€</div>
                  <div class="text-xs text-gray-500">par semaine</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- No data -->
      <div
        v-else
        class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-600"
      >
        Aucun tarif configuré pour le moment. Veuillez nous contacter pour plus d'informations.
      </div>

      <!-- Services inclus -->
      <div class="mt-8 bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-xl font-semibold text-dark mb-4">Services inclus</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="service in INCLUDED_SERVICES" :key="service" class="flex items-center">
            <svg
              class="w-5 h-5 text-primary mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span class="text-gray-700">{{ service }}</span>
          </div>
        </div>
      </div>

      <!-- Suppléments -->
      <div class="mt-8 bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-xl font-semibold text-dark mb-4">Suppléments optionnels</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-primary mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span
              >Forfait ménage: <strong>{{ TARIFS.menage }}€</strong></span
            >
          </div>
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-primary mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span
              >Draps + Serviettes: <strong>{{ TARIFS.linge }}€</strong> par personne</span
            >
          </div>
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-primary mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span
              >Taxe de séjour: <strong>{{ TARIFS.taxeSejour }}€</strong> par personne et par
              jour</span
            >
          </div>
        </div>

        <p class="text-center mt-8 text-text/80">
          Location de {{ LOGEMENT.nom }} située dans le {{ LOGEMENT.adresse }}<br />
          {{ LOGEMENT.codePostal }} {{ LOGEMENT.ville.toUpperCase() }}, Ardèche
        </p>
      </div>
    </div>
  </div>
</template>
