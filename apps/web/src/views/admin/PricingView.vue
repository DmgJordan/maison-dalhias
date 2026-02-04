<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  seasonsApi,
  datePeriodsApi,
  settingsApi,
  type Season,
  type DatePeriod,
  type Settings,
} from '../../lib/api';
import SeasonModal from '../../components/admin/SeasonModal.vue';
import DatePeriodModal from '../../components/admin/DatePeriodModal.vue';
import { generatePricingGrid } from '../../services/pdf/pricingGridGenerator';
import { formatPrice, formatDateShort, countDays } from '../../utils/formatting';

// Settings state
const settings = ref<Settings | null>(null);
const loadingSettings = ref(false);
const editingDefaultPrice = ref(false);
const tempDefaultPrice = ref(100);
const savingSettings = ref(false);

// Seasons state
const seasons = ref<Season[]>([]);
const loadingSeasons = ref(false);

// Date periods state
const datePeriods = ref<DatePeriod[]>([]);
const availableYears = ref<number[]>([]);
const selectedYear = ref<number | null>(null);
const loadingPeriods = ref(false);

// Global state
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Season modal state
const showSeasonModal = ref(false);
const editingSeason = ref<Season | null>(null);
const isSubmittingSeason = ref(false);
const deletingSeasonId = ref<string | null>(null);
const confirmDeleteSeasonId = ref<string | null>(null);

// Date period modal state
const showPeriodModal = ref(false);
const editingPeriod = ref<DatePeriod | null>(null);
const isSubmittingPeriod = ref(false);
const deletingPeriodId = ref<string | null>(null);
const confirmDeletePeriodId = ref<string | null>(null);

// PDF generation state
const generatingPdf = ref(false);

// Copy year state
const showCopyModal = ref(false);
const copySourceYear = ref<number | null>(null);
const copyingPeriods = ref(false);

// Computed: gaps in date coverage
const uncoveredDaysInfo = computed(() => {
  if (!selectedYear.value || datePeriods.value.length === 0) {
    return null;
  }

  const year = selectedYear.value;
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const sortedPeriods = [...datePeriods.value].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const gaps: { start: Date; end: Date; days: number }[] = [];
  let currentDate = yearStart;

  for (const period of sortedPeriods) {
    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);

    if (periodStart > currentDate) {
      const gapDays = Math.ceil(
        (periodStart.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (gapDays > 0) {
        gaps.push({
          start: new Date(currentDate),
          end: new Date(periodStart.getTime() - 24 * 60 * 60 * 1000),
          days: gapDays,
        });
      }
    }

    if (periodEnd > currentDate) {
      currentDate = new Date(periodEnd);
    }
  }

  if (currentDate < yearEnd) {
    const gapDays = Math.ceil((yearEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (gapDays > 0) {
      gaps.push({
        start: new Date(currentDate),
        end: yearEnd,
        days: gapDays + 1,
      });
    }
  }

  if (gaps.length === 0) return null;

  const totalDays = gaps.reduce((sum, gap) => sum + gap.days, 0);
  return { gaps, totalDays };
});

// Fetch functions
const fetchSettings = async (): Promise<void> => {
  try {
    loadingSettings.value = true;
    settings.value = await settingsApi.get();
    tempDefaultPrice.value = settings.value.defaultPricePerNight;
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des paramètres:', error);
  } finally {
    loadingSettings.value = false;
  }
};

const fetchSeasons = async (): Promise<void> => {
  try {
    loadingSeasons.value = true;
    error.value = null;
    seasons.value = await seasonsApi.getAll();
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des saisons:', error);
    showError('Impossible de charger les saisons.');
  } finally {
    loadingSeasons.value = false;
  }
};

const fetchAvailableYears = async (): Promise<void> => {
  try {
    const years = await datePeriodsApi.getAvailableYears();
    availableYears.value = years;

    const currentYear = new Date().getFullYear();
    if (years.includes(currentYear)) {
      selectedYear.value = currentYear;
    } else if (years.length > 0) {
      selectedYear.value = years[years.length - 1];
    }
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des années:', error);
  }
};

const fetchDatePeriods = async (): Promise<void> => {
  if (!selectedYear.value) {
    datePeriods.value = [];
    return;
  }

  try {
    loadingPeriods.value = true;
    datePeriods.value = await datePeriodsApi.getByYear(selectedYear.value);
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des plages:', error);
    showError('Impossible de charger les plages de dates.');
  } finally {
    loadingPeriods.value = false;
  }
};

watch(selectedYear, () => {
  void fetchDatePeriods();
});

// Settings handlers
const startEditDefaultPrice = (): void => {
  tempDefaultPrice.value = settings.value?.defaultPricePerNight ?? 100;
  editingDefaultPrice.value = true;
};

const cancelEditDefaultPrice = (): void => {
  editingDefaultPrice.value = false;
  tempDefaultPrice.value = settings.value?.defaultPricePerNight ?? 100;
};

const saveDefaultPrice = async (): Promise<void> => {
  try {
    savingSettings.value = true;
    error.value = null;
    settings.value = await settingsApi.update({ defaultPricePerNight: tempDefaultPrice.value });
    editingDefaultPrice.value = false;
    showSuccess('Tarif par défaut mis à jour');
  } catch (error: unknown) {
    console.error('Erreur lors de la sauvegarde:', error);
    showError('Impossible de sauvegarder le tarif par défaut.');
  } finally {
    savingSettings.value = false;
  }
};

// Helpers
const showSuccess = (message: string): void => {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = null;
  }, 3000);
};

const showError = (message: string): void => {
  error.value = message;
  setTimeout(() => {
    error.value = null;
  }, 8000);
};

// Wrapper pour formater les dates de gap (objets Date)
const formatGapDate = (date: Date): string => {
  return formatDateShort(date, false);
};

// Season handlers
const openCreateSeasonModal = (): void => {
  editingSeason.value = null;
  showSeasonModal.value = true;
};

const openEditSeasonModal = (season: Season): void => {
  editingSeason.value = season;
  showSeasonModal.value = true;
};

const closeSeasonModal = (): void => {
  showSeasonModal.value = false;
  editingSeason.value = null;
};

interface SeasonSaveData {
  name: string;
  pricePerNight: number;
  weeklyNightRate?: number | null;
  minNights: number;
}

const handleSaveSeason = async (data: SeasonSaveData): Promise<void> => {
  try {
    isSubmittingSeason.value = true;
    error.value = null;

    if (editingSeason.value) {
      await seasonsApi.update(editingSeason.value.id, data);
      showSuccess('Saison modifiée');
    } else {
      await seasonsApi.create(data);
      showSuccess('Saison créée');
    }

    closeSeasonModal();
    await fetchSeasons();
    await fetchDatePeriods();
  } catch (error: unknown) {
    console.error('Erreur lors de la sauvegarde:', error);
    showError('Erreur lors de la sauvegarde.');
  } finally {
    isSubmittingSeason.value = false;
  }
};

const handleDeleteSeason = async (id: string): Promise<void> => {
  try {
    deletingSeasonId.value = id;
    error.value = null;
    await seasonsApi.delete(id);
    showSuccess('Saison supprimée');
    confirmDeleteSeasonId.value = null;
    await fetchSeasons();
    await fetchDatePeriods();
  } catch (error: unknown) {
    console.error('Erreur lors de la suppression:', error);
    showError('Impossible de supprimer la saison.');
  } finally {
    deletingSeasonId.value = null;
  }
};

// Date period handlers
const handleSelectYear = (year: number): void => {
  selectedYear.value = year;
};

const handleAddYear = (): void => {
  const currentYear = new Date().getFullYear();
  let newYear = currentYear;

  if (availableYears.value.length > 0) {
    newYear = Math.max(...availableYears.value) + 1;
  }

  if (!availableYears.value.includes(newYear)) {
    availableYears.value = [...availableYears.value, newYear].sort((a, b) => a - b);
  }
  selectedYear.value = newYear;
};

const openCreatePeriodModal = (): void => {
  editingPeriod.value = null;
  showPeriodModal.value = true;
};

const openEditPeriodModal = (period: DatePeriod): void => {
  editingPeriod.value = period;
  showPeriodModal.value = true;
};

const closePeriodModal = (): void => {
  showPeriodModal.value = false;
  editingPeriod.value = null;
};

const handleSavePeriod = async (data: {
  startDate: string;
  endDate: string;
  year: number;
  seasonId: string;
}): Promise<void> => {
  try {
    isSubmittingPeriod.value = true;
    error.value = null;

    if (editingPeriod.value) {
      await datePeriodsApi.update(editingPeriod.value.id, data);
      showSuccess('Plage modifiée');
    } else {
      await datePeriodsApi.create(data);
      showSuccess('Plage créée');
    }

    closePeriodModal();
    await fetchDatePeriods();
    await fetchAvailableYears();
  } catch (error: unknown) {
    console.error('Erreur lors de la sauvegarde:', error);
    showError('Erreur lors de la sauvegarde. Vérifiez les chevauchements.');
  } finally {
    isSubmittingPeriod.value = false;
  }
};

const handleDeletePeriod = async (id: string): Promise<void> => {
  try {
    deletingPeriodId.value = id;
    error.value = null;
    await datePeriodsApi.delete(id);
    showSuccess('Plage supprimée');
    confirmDeletePeriodId.value = null;
    await fetchDatePeriods();
  } catch (error: unknown) {
    console.error('Erreur lors de la suppression:', error);
    showError('Impossible de supprimer la plage.');
  } finally {
    deletingPeriodId.value = null;
  }
};

// Copy year handlers
const openCopyModal = (): void => {
  // Pre-select the most recent year with data (excluding current year)
  const yearsWithData = availableYears.value.filter((y) => y !== selectedYear.value);
  copySourceYear.value = yearsWithData.length > 0 ? yearsWithData[yearsWithData.length - 1] : null;
  showCopyModal.value = true;
};

const closeCopyModal = (): void => {
  showCopyModal.value = false;
  copySourceYear.value = null;
};

const handleCopyPeriods = async (): Promise<void> => {
  if (!copySourceYear.value || !selectedYear.value) return;

  try {
    copyingPeriods.value = true;
    error.value = null;

    const result = await datePeriodsApi.copyFromYear(copySourceYear.value, selectedYear.value);
    showSuccess(`${result.copiedCount} plage(s) copiée(s) depuis ${copySourceYear.value}`);
    closeCopyModal();
    await fetchDatePeriods();
    await fetchAvailableYears();
  } catch (error: unknown) {
    console.error('Erreur lors de la copie:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la copie';
    // Try to extract message from API error
    const apiError = error as { response?: { data?: { message?: string } } };
    showError(apiError.response?.data?.message ?? errorMessage);
  } finally {
    copyingPeriods.value = false;
  }
};

// PDF generation handler
const handleGeneratePdf = async (): Promise<void> => {
  if (!selectedYear.value || seasons.value.length === 0) return;

  try {
    generatingPdf.value = true;
    error.value = null;
    await generatePricingGrid(selectedYear.value, seasons.value, datePeriods.value);
    showSuccess('PDF généré avec succès');
  } catch (error: unknown) {
    console.error('Erreur lors de la génération du PDF:', error);
    showError('Impossible de générer le PDF.');
  } finally {
    generatingPdf.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchSeasons(), fetchAvailableYears()]);
});
</script>

<template>
  <div class="pricing-page">
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="successMessage" class="toast" role="status" aria-live="polite">
        <svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        {{ successMessage }}
      </div>
    </Transition>

    <!-- Error -->
    <div v-if="error" class="error-bar" role="alert" aria-live="assertive">
      <span>{{ error }}</span>
      <button aria-label="Fermer le message d'erreur" @click="error = null">Fermer</button>
    </div>

    <!-- Alert: No seasons configured -->
    <div v-if="!loadingSeasons && seasons.length === 0" class="alert-banner">
      <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <div class="alert-content">
        <strong>Tarifs non configurés</strong>
        <p>
          Aucune saison n'est définie. Le tarif par défaut ({{
            formatPrice(settings?.defaultPricePerNight ?? 100)
          }}/nuit) sera appliqué pour toutes les réservations.
        </p>
      </div>
    </div>

    <!-- Settings: Default price -->
    <section class="settings-panel">
      <div class="settings-row">
        <div class="settings-info">
          <span class="settings-label">Tarif par défaut</span>
          <span class="settings-desc">Appliqué pour les jours sans saison configurée</span>
        </div>
        <div v-if="!editingDefaultPrice" class="settings-value">
          <span class="default-price"
            >{{ formatPrice(settings?.defaultPricePerNight ?? 100)
            }}<span class="price-unit">/nuit</span></span
          >
          <button
            class="action-btn"
            aria-label="Modifier le tarif par défaut"
            @click="startEditDefaultPrice"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
              />
            </svg>
          </button>
        </div>
        <div v-else class="settings-edit">
          <div class="price-input-wrapper">
            <input
              v-model.number="tempDefaultPrice"
              type="number"
              min="1"
              step="5"
              class="price-input"
            />
            <span class="input-suffix">EUR/nuit</span>
          </div>
          <button
            class="btn btn-primary btn-sm"
            :disabled="savingSettings"
            @click="saveDefaultPrice"
          >
            {{ savingSettings ? '...' : 'OK' }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="cancelEditDefaultPrice">Annuler</button>
        </div>
      </div>
    </section>

    <!-- Main Grid -->
    <div class="main-grid">
      <!-- Left Column: Seasons -->
      <section class="panel">
        <header class="panel-header">
          <div>
            <h2 class="panel-title">Saisons</h2>
            <p class="panel-subtitle">Tarifs par type de période</p>
          </div>
          <button class="btn btn-primary" @click="openCreateSeasonModal">
            <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            Nouvelle saison
          </button>
        </header>

        <div v-if="loadingSeasons" class="loading-placeholder">
          <div class="loader"></div>
        </div>

        <div v-else-if="seasons.length === 0" class="empty-state">
          <p>Aucune saison définie</p>
          <button class="btn btn-secondary" @click="openCreateSeasonModal">Créer une saison</button>
        </div>

        <div v-else class="seasons-table">
          <div v-for="season in seasons" :key="season.id" class="season-row">
            <div class="season-info">
              <span class="season-name">{{ season.name }}</span>
              <div class="season-meta">
                <span
                  v-if="season.datePeriods && season.datePeriods.length > 0"
                  class="season-periods"
                >
                  {{ season.datePeriods.length }} période{{
                    season.datePeriods.length > 1 ? 's' : ''
                  }}
                </span>
                <span v-if="season.minNights > 3" class="season-min-nights">
                  Min {{ season.minNights }} nuits
                </span>
              </div>
            </div>
            <div class="season-pricing">
              <div class="season-price">
                {{ formatPrice(season.pricePerNight) }}<span class="price-unit">/nuit</span>
              </div>
              <div v-if="season.weeklyNightRate" class="season-weekly">
                {{ formatPrice(season.weeklyNightRate * 7) }}<span class="price-unit">/sem</span>
              </div>
            </div>
            <div class="season-actions">
              <button
                class="action-btn"
                :aria-label="`Modifier la saison ${season.name}`"
                @click="openEditSeasonModal(season)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                  />
                </svg>
              </button>
              <button
                v-if="confirmDeleteSeasonId !== season.id"
                class="action-btn action-btn--danger"
                :aria-label="`Supprimer la saison ${season.name}`"
                @click="confirmDeleteSeasonId = season.id"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div v-else class="confirm-delete">
                <button
                  class="btn btn-danger btn-sm"
                  :disabled="deletingSeasonId === season.id"
                  @click="handleDeleteSeason(season.id)"
                >
                  {{ deletingSeasonId === season.id ? '...' : 'Supprimer' }}
                </button>
                <button class="btn btn-ghost btn-sm" @click="confirmDeleteSeasonId = null">
                  Non
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Date Periods -->
      <section class="panel panel--periods">
        <header class="panel-header">
          <div>
            <h2 class="panel-title">Calendrier tarifaire</h2>
            <p class="panel-subtitle">Attribution des saisons par période</p>
          </div>
          <div class="header-actions">
            <button
              v-if="selectedYear && seasons.length > 0 && datePeriods.length > 0"
              class="btn btn-secondary"
              :disabled="generatingPdf"
              @click="handleGeneratePdf"
            >
              <svg
                v-if="generatingPdf"
                class="btn-icon btn-icon--spin"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="10" cy="10" r="8" />
              </svg>
              <svg v-else class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ generatingPdf ? 'Génération...' : 'Grille PDF' }}
            </button>
            <button
              v-if="selectedYear && seasons.length > 0"
              class="btn btn-primary"
              @click="openCreatePeriodModal"
            >
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clip-rule="evenodd"
                />
              </svg>
              Nouvelle plage
            </button>
          </div>
        </header>

        <!-- Year Selector -->
        <div v-if="seasons.length > 0" class="year-selector">
          <button
            v-for="year in availableYears"
            :key="year"
            class="year-btn"
            :class="{ 'year-btn--active': selectedYear === year }"
            @click="handleSelectYear(year)"
          >
            {{ year }}
          </button>
          <button class="year-btn year-btn--add" @click="handleAddYear">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            {{
              availableYears.length > 0 ? Math.max(...availableYears) + 1 : new Date().getFullYear()
            }}
          </button>
        </div>

        <!-- Warning for uncovered days -->
        <div v-if="uncoveredDaysInfo" class="warning-banner" role="status" aria-live="polite">
          <svg class="warning-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="warning-text">
            <strong
              >{{ uncoveredDaysInfo.totalDays }} jour{{
                uncoveredDaysInfo.totalDays > 1 ? 's' : ''
              }}
              sans tarif</strong
            >
            <span class="warning-gaps">
              <span v-for="(gap, i) in uncoveredDaysInfo.gaps" :key="i">
                {{ formatGapDate(gap.start) }} - {{ formatGapDate(gap.end)
                }}{{ i < uncoveredDaysInfo.gaps.length - 1 ? ', ' : '' }}
              </span>
            </span>
          </div>
        </div>

        <!-- Empty states -->
        <div v-if="seasons.length === 0" class="info-banner">
          Créez d'abord des saisons pour définir le calendrier.
        </div>

        <div v-else-if="loadingPeriods" class="loading-placeholder">
          <div class="loader"></div>
        </div>

        <div v-else-if="!selectedYear || datePeriods.length === 0" class="empty-state">
          <p v-if="!selectedYear">Sélectionnez une année</p>
          <p v-else>Aucune plage définie pour {{ selectedYear }}</p>
          <div v-if="selectedYear" class="empty-actions">
            <button class="btn btn-secondary" @click="openCreatePeriodModal">
              Ajouter une plage
            </button>
            <button
              v-if="availableYears.filter((y) => y !== selectedYear).length > 0"
              class="btn btn-secondary"
              @click="openCopyModal"
            >
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path
                  d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"
                />
              </svg>
              Copier depuis une autre année
            </button>
          </div>
        </div>

        <!-- Periods Table -->
        <div v-else class="periods-table">
          <div class="periods-header">
            <span class="col-dates">Période</span>
            <span class="col-season">Saison</span>
            <span class="col-price">Nuit</span>
            <span class="col-weekly">Semaine</span>
            <span class="col-actions"></span>
          </div>
          <div v-for="period in datePeriods" :key="period.id" class="period-row">
            <div class="col-dates">
              <span class="date-range"
                >{{ formatDateShort(period.startDate) }} →
                {{ formatDateShort(period.endDate) }}</span
              >
              <span class="date-days">{{ countDays(period.startDate, period.endDate) }} jours</span>
            </div>
            <div class="col-season">{{ period.season.name }}</div>
            <div class="col-price">{{ formatPrice(period.season.pricePerNight) }}</div>
            <div class="col-weekly">
              {{
                formatPrice(
                  (seasons.find((s) => s.id === period.season.id)?.weeklyNightRate ??
                    period.season.pricePerNight) * 7
                )
              }}
            </div>
            <div class="col-actions">
              <button
                class="action-btn"
                :aria-label="`Modifier la plage ${formatDateShort(period.startDate)} - ${formatDateShort(period.endDate)}`"
                @click="openEditPeriodModal(period)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                  />
                </svg>
              </button>
              <button
                v-if="confirmDeletePeriodId !== period.id"
                class="action-btn action-btn--danger"
                :aria-label="`Supprimer la plage ${formatDateShort(period.startDate)} - ${formatDateShort(period.endDate)}`"
                @click="confirmDeletePeriodId = period.id"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div v-else class="confirm-delete">
                <button
                  class="btn btn-danger btn-sm"
                  :disabled="deletingPeriodId === period.id"
                  @click="handleDeletePeriod(period.id)"
                >
                  {{ deletingPeriodId === period.id ? '...' : 'Oui' }}
                </button>
                <button class="btn btn-ghost btn-sm" @click="confirmDeletePeriodId = null">
                  Non
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modals -->
    <SeasonModal
      v-if="showSeasonModal"
      :season="editingSeason"
      :submitting="isSubmittingSeason"
      @close="closeSeasonModal"
      @save="handleSaveSeason"
    />

    <DatePeriodModal
      v-if="showPeriodModal && selectedYear"
      :period="editingPeriod"
      :seasons="seasons"
      :year="selectedYear"
      :submitting="isSubmittingPeriod"
      @close="closePeriodModal"
      @save="handleSavePeriod"
    />

    <!-- Copy Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCopyModal" class="modal-overlay" @click.self="closeCopyModal">
          <div
            class="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-modal-title"
          >
            <div class="modal-header">
              <h3 id="copy-modal-title" class="modal-title">Copier les plages</h3>
              <button class="modal-close" aria-label="Fermer" @click="closeCopyModal">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <p class="copy-description">
                Copier toutes les plages de dates d'une année précédente vers
                <strong>{{ selectedYear }}</strong
                >.
              </p>
              <div class="form-group">
                <label class="form-label">Copier depuis l'année :</label>
                <div class="copy-year-options">
                  <button
                    v-for="year in availableYears.filter((y) => y !== selectedYear)"
                    :key="year"
                    class="copy-year-btn"
                    :class="{ 'copy-year-btn--active': copySourceYear === year }"
                    @click="copySourceYear = year"
                  >
                    {{ year }}
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" @click="closeCopyModal">Annuler</button>
              <button
                class="btn btn-primary"
                :disabled="!copySourceYear || copyingPeriods"
                @click="handleCopyPeriods"
              >
                {{ copyingPeriods ? 'Copie en cours...' : `Copier depuis ${copySourceYear ?? ''}` }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.pricing-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* Toast */
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #065f46;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.toast-icon {
  width: 18px;
  height: 18px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* Error Bar */
.error-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 24px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;
}

.error-bar button {
  padding: 4px 12px;
  background: white;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 13px;
  cursor: pointer;
}

/* Alert Banner */
.alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 24px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 12px;
}

.alert-icon {
  width: 24px;
  height: 24px;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-content strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 4px;
}

.alert-content p {
  margin: 0;
  font-size: 14px;
  color: #a16207;
  line-height: 1.5;
}

/* Settings Panel */
.settings-panel {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 16px 24px;
  margin-bottom: 24px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.settings-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-label {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.settings-desc {
  font-size: 13px;
  color: #6b7280;
}

.settings-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.default-price {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.settings-edit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-input-wrapper {
  position: relative;
}

.price-input {
  width: 100px;
  padding: 8px 70px 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  transition: border-color 0.15s;
}

.price-input:focus {
  outline: none;
  border-color: #ff385c;
}

.input-suffix {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #6b7280;
  pointer-events: none;
}

/* Main Grid */
.main-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 1024px) {
  .main-grid {
    grid-template-columns: 380px 1fr;
    align-items: start;
  }
}

/* Panel */
.panel {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.panel-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 4px 0 0 0;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  white-space: nowrap;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn-icon--spin {
  animation: spin 1s linear infinite;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-primary {
  background: #ff385c;
  color: white;
}

.btn-primary:hover {
  background: #e31c5f;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-ghost {
  background: transparent;
  color: #6b7280;
}

.btn-ghost:hover {
  background: #f3f4f6;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 13px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading */
.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.loader {
  width: 28px;
  height: 28px;
  border: 2px solid #e5e7eb;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
}

.empty-state p {
  color: #6b7280;
  font-size: 15px;
  margin: 0;
}

/* Info Banner */
.info-banner {
  margin: 20px 24px;
  padding: 14px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #0369a1;
  font-size: 14px;
}

/* Warning Banner */
.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 0 24px 16px;
  padding: 14px 16px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
}

.warning-icon {
  width: 20px;
  height: 20px;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 1px;
}

.warning-text {
  font-size: 14px;
  color: #92400e;
}

.warning-text strong {
  display: block;
  margin-bottom: 2px;
}

.warning-gaps {
  font-size: 13px;
  color: #a16207;
}

/* Seasons Table */
.seasons-table {
  padding: 8px 0;
}

.season-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: start;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.season-row:last-child {
  border-bottom: none;
}

.season-row:hover {
  background: #fafafa;
}

.season-info {
  min-width: 0;
}

.season-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.season-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.season-periods {
  font-size: 12px;
  color: #9ca3af;
}

.season-min-nights {
  font-size: 11px;
  padding: 2px 6px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-weight: 500;
}

.season-pricing {
  text-align: right;
}

.season-price {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.season-weekly {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.price-unit {
  font-size: 13px;
  font-weight: 400;
  color: #6b7280;
  margin-left: 2px;
}

.season-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Action Buttons */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.action-btn--danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.confirm-delete {
  display: flex;
  gap: 4px;
}

/* Year Selector */
.year-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.year-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.year-btn:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.year-btn--active {
  border-color: #ff385c;
  background: #fff1f2;
  color: #be123c;
}

.year-btn--add {
  border-style: dashed;
  color: #6b7280;
}

.year-btn--add:hover {
  border-color: #ff385c;
  color: #ff385c;
}

.year-btn svg {
  width: 14px;
  height: 14px;
}

/* Periods Table */
.periods-table {
  padding: 0;
}

.periods-header {
  display: none;
}

@media (min-width: 768px) {
  .periods-header {
    display: grid;
    grid-template-columns: 1fr 120px 80px 90px 80px;
    gap: 16px;
    padding: 12px 24px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.period-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.period-row:last-child {
  border-bottom: none;
}

.period-row:hover {
  background: #fafafa;
}

@media (min-width: 768px) {
  .period-row {
    grid-template-columns: 1fr 120px 80px 90px 80px;
    align-items: center;
    gap: 16px;
  }
}

.col-dates {
  min-width: 0;
}

.date-range {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.date-days {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.col-season {
  font-size: 14px;
  color: #374151;
}

.col-price {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.col-weekly {
  font-size: 15px;
  font-weight: 600;
  color: #059669;
  font-variant-numeric: tabular-nums;
}

.col-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

/* Empty state actions */
.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

@media (min-width: 768px) {
  .empty-actions {
    flex-direction: row;
  }
}

/* Copy Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.modal-content {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.copy-description {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.copy-description strong {
  color: #111827;
}

.form-group {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 10px;
}

.copy-year-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.copy-year-btn {
  padding: 12px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  background: white;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.copy-year-btn:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.copy-year-btn--active {
  border-color: #ff385c;
  background: #fff1f2;
  color: #be123c;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .panel-header .btn {
    justify-content: center;
  }

  .season-row {
    grid-template-columns: 1fr auto;
    gap: 12px;
  }

  .season-price {
    font-size: 18px;
  }

  .col-season,
  .col-price,
  .col-weekly {
    display: none;
  }

  .period-row {
    padding: 14px 20px;
  }
}
</style>
