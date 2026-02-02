<script setup lang="ts">
import { PRICING_PERIODS, INCLUDED_SERVICES, TARIFS, LOGEMENT } from '@/constants/property';

const pricingPeriods = PRICING_PERIODS;
const includedServices = INCLUDED_SERVICES;
</script>
<template>
  <div class="min-h-screen py-16 bg-background">
    <div class="container-custom">
      <h1 class="text-4xl font-bold text-center text-dark mb-4">Tarifs de la Maison Dalhia 19</h1>
      <p class="text-center text-text/80 mb-12">
        Située dans le Domaine du Rouret - Pierre & Vacances
      </p>

      <!-- Version mobile -->
      <div class="lg:hidden space-y-4">
        <div
          v-for="period in pricingPeriods"
          :key="period.name"
          class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <h2 class="text-xl font-semibold text-dark mb-2">{{ period.name }}</h2>
          <p class="text-sm text-text/60 mb-4">{{ period.dates }}</p>
          <div class="flex justify-between items-center mb-4">
            <div>
              <div class="text-2xl font-bold text-primary">{{ period.pricePerNight }}€</div>
              <div class="text-sm text-text/60">par nuit</div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-primary">{{ period.price }}€</div>
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
              <th class="px-6 py-4 text-right text-sm font-semibold text-gray-900">Prix/Semaine</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="period in pricingPeriods"
              :key="period.name"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">{{ period.name }}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ period.dates }}</td>
              <td class="px-6 py-4 text-right">
                <div class="font-medium text-primary">{{ period.pricePerNight }}€</div>
                <div class="text-xs text-gray-500">par nuit</div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="font-medium text-primary">{{ period.price }}€</div>
                <div class="text-xs text-gray-500">par semaine</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Services inclus -->
      <div class="mt-8 bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-xl font-semibold text-dark mb-4">Services inclus</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="service in includedServices" :key="service" class="flex items-center">
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
