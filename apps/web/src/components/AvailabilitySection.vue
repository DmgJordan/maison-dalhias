<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import {
  bookingsApi,
  datePeriodsApi,
  pricingApi,
  type DatePeriod,
  type PriceCalculation,
} from '../lib/api';
import { BOOKING_CONSTANTS } from '@/constants/property';

interface BookedDate {
  start: Date;
  end: Date;
  label: string;
  status: string;
}

const MIN_STAY_DAYS = BOOKING_CONSTANTS.minStayDays;
const bookedDates = ref<BookedDate[]>([]);
const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const calendarDays = ref<
  Array<{
    date: Date;
    isCurrentMonth: boolean;
    isBooked: boolean;
    isAvailable: boolean;
    pricePerNight: number;
  }>
>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedStartDate = ref<Date | null>(null);
const selectedEndDate = ref<Date | null>(null);
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const showPriceOnMobile = ref<number | null>(null);

// Plages de dates dynamiques chargées depuis l'API
const datePeriods = ref<DatePeriod[]>([]);
const loadingPeriods = ref(false);

// Calcul de prix dynamique
const priceCalculation = ref<PriceCalculation | null>(null);
const calculatingPrice = ref(false);

const togglePriceOnMobile = (dayIndex: number): void => {
  if (showPriceOnMobile.value === dayIndex) {
    showPriceOnMobile.value = null;
  } else {
    showPriceOnMobile.value = dayIndex;
  }
};

const monthNames = [
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

const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

const showNotification = (message: string) => {
  snackbarMessage.value = message;
  showSnackbar.value = true;
  setTimeout(() => {
    showSnackbar.value = false;
  }, 3000);
};

// Charger les plages de dates pour une année donnée
const fetchDatePeriods = async (year: number): Promise<void> => {
  try {
    loadingPeriods.value = true;
    const periods = await datePeriodsApi.getByYear(year);
    // Fusionner avec les périodes existantes (pour gérer plusieurs années)
    const existingYears = datePeriods.value.filter(
      (p) => new Date(p.startDate).getFullYear() !== year
    );
    datePeriods.value = [...existingYears, ...periods];
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des périodes tarifaires:', error);
  } finally {
    loadingPeriods.value = false;
  }
};

// Trouver le prix pour une date donnée depuis les plages dynamiques
const getPriceForDateFromPeriods = (date: Date): number => {
  const dateNormalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  for (const period of datePeriods.value) {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (dateNormalized >= startDate && dateNormalized < endDate) {
      return period.season.pricePerNight;
    }
  }

  return 0; // Pas de tarif configuré pour cette date
};

// Vérifier si une date est disponible (a un tarif configuré et n'est pas dans le passé)
const isDateAvailable = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    return false;
  }

  // Une date est disponible si elle a un tarif configuré dans les plages
  return getPriceForDateFromPeriods(date) > 0;
};

const fetchBookings = async (): Promise<void> => {
  try {
    loading.value = true;

    // Charger les plages de dates pour l'année en cours et l'année suivante
    const yearsToLoad = [currentYear.value];
    if (currentMonth.value >= 10) {
      yearsToLoad.push(currentYear.value + 1);
    }

    // Charger les réservations et les plages de dates en parallèle
    const [bookings] = await Promise.all([
      bookingsApi.getAll(),
      ...yearsToLoad.map((year) => fetchDatePeriods(year)),
    ]);

    bookedDates.value = bookings
      .filter((booking) => booking.status !== 'CANCELLED')
      .map((booking) => {
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);

        return {
          start,
          end,
          label: 'Réservé',
          status: booking.status,
        };
      });

    generateCalendar();
  } catch (err: unknown) {
    console.error('Erreur lors de la récupération des réservations:', err);
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};

const generateCalendar = (): void => {
  const firstDayOfMonth = new Date(currentYear.value, currentMonth.value, 1);
  const lastDayOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0);

  const startDay = new Date(firstDayOfMonth);
  startDay.setDate(startDay.getDate() - (startDay.getDay() === 0 ? 6 : startDay.getDay() - 1));

  const days: Array<{
    date: Date;
    isCurrentMonth: boolean;
    isBooked: boolean;
    isAvailable: boolean;
    pricePerNight: number;
  }> = [];

  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDay);
    currentDate.setDate(startDay.getDate() + i);

    const isBooked = isDateBooked(currentDate);
    const pricePerNight = getPriceForDateFromPeriods(currentDate);
    const isAvailable =
      !isBooked && pricePerNight > 0 && currentDate >= new Date(new Date().setHours(0, 0, 0, 0));

    days.push({
      date: currentDate,
      isCurrentMonth: currentDate.getMonth() === currentMonth.value,
      isBooked,
      isAvailable,
      pricePerNight,
    });

    if (currentDate > lastDayOfMonth && i >= 35) break;
  }

  calendarDays.value = days;
};

const isDateBooked = (date: Date): boolean => {
  if (!date) return false;

  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  for (const booking of bookedDates.value) {
    const startDate = new Date(
      booking.start.getFullYear(),
      booking.start.getMonth(),
      booking.start.getDate()
    );
    const endDate = new Date(
      booking.end.getFullYear(),
      booking.end.getMonth(),
      booking.end.getDate()
    );

    if (checkDate >= startDate && checkDate < endDate) {
      return true;
    }
  }

  return false;
};

const handleDateClick = (day: {
  date: Date;
  isBooked: boolean;
  isCurrentMonth: boolean;
  isAvailable: boolean;
}) => {
  if (!day.isCurrentMonth || day.isBooked || !day.isAvailable) {
    if (!day.isAvailable) {
      showNotification("Cette date n'est pas disponible à la réservation");
    } else if (day.isBooked) {
      showNotification('Cette date est déjà réservée');
    }
    return;
  }

  const clickedDate = new Date(day.date);

  if (!selectedStartDate.value || (selectedStartDate.value && selectedEndDate.value)) {
    selectedStartDate.value = clickedDate;
    selectedEndDate.value = null;
  } else {
    if (clickedDate < selectedStartDate.value) {
      selectedStartDate.value = clickedDate;
    } else {
      const daysDifference = Math.ceil(
        (clickedDate.getTime() - selectedStartDate.value.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference < MIN_STAY_DAYS) {
        showNotification(`La durée minimum de séjour est de ${MIN_STAY_DAYS} nuits`);
        return;
      }

      let hasBookedDateInRange = false;
      const currentDate = new Date(selectedStartDate.value);

      while (currentDate <= clickedDate) {
        if (isDateBooked(currentDate)) {
          hasBookedDateInRange = true;
          break;
        }

        if (!isDateAvailable(currentDate)) {
          showNotification(
            'Certaines dates sélectionnées ne sont pas disponibles à la réservation'
          );
          return;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (hasBookedDateInRange) {
        showNotification('Votre sélection inclut des dates déjà réservées');
        return;
      }

      selectedEndDate.value = clickedDate;
    }
  }
};

const previousMonth = async (): Promise<void> => {
  const oldYear = currentYear.value;
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }

  // Charger les plages de la nouvelle année si nécessaire
  if (currentYear.value !== oldYear) {
    await fetchDatePeriods(currentYear.value);
  }
  generateCalendar();
};

const nextMonth = async (): Promise<void> => {
  const oldYear = currentYear.value;
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }

  // Charger les plages de la nouvelle année si nécessaire
  if (currentYear.value !== oldYear) {
    await fetchDatePeriods(currentYear.value);
  }
  generateCalendar();
};

const isDateSelected = (date: Date) => {
  if (!selectedStartDate.value) return false;

  if (selectedEndDate.value) {
    return date >= selectedStartDate.value && date <= selectedEndDate.value;
  }

  return date.getTime() === selectedStartDate.value.getTime();
};

// Calculer le prix total via l'API quand les dates changent
const calculatePriceFromApi = async (): Promise<void> => {
  if (!selectedStartDate.value || !selectedEndDate.value) {
    priceCalculation.value = null;
    return;
  }

  try {
    calculatingPrice.value = true;
    const startDateStr = selectedStartDate.value.toISOString().split('T')[0];
    const endDateStr = selectedEndDate.value.toISOString().split('T')[0];
    priceCalculation.value = await pricingApi.calculate(startDateStr, endDateStr);
  } catch (error: unknown) {
    console.error('Erreur lors du calcul du prix:', error);
    priceCalculation.value = null;
  } finally {
    calculatingPrice.value = false;
  }
};

// Watcher pour recalculer le prix quand les dates changent
watch(
  () => [selectedStartDate.value, selectedEndDate.value],
  async () => {
    if (selectedStartDate.value && selectedEndDate.value) {
      await calculatePriceFromApi();
    }
  },
  { deep: true }
);

// Prix total calculé (depuis l'API ou 0)
const calculateTotalPrice = computed((): number => {
  return priceCalculation.value?.totalPrice ?? 0;
});

const selectedPeriod = computed(() => {
  if (!selectedStartDate.value || !selectedEndDate.value) return null;

  const nights = Math.ceil(
    (selectedEndDate.value.getTime() - selectedStartDate.value.getTime()) / (1000 * 60 * 60 * 24)
  );
  const startDateStr = selectedStartDate.value.toLocaleDateString('fr-FR');
  const endDateStr = selectedEndDate.value.toLocaleDateString('fr-FR');

  return {
    nights,
    startDate: startDateStr,
    endDate: endDateStr,
    totalPrice: calculateTotalPrice.value,
  };
});

const scrollToContact = () => {
  const contactForm = document.getElementById('contact');
  if (contactForm) {
    contactForm.scrollIntoView({ behavior: 'smooth' });
    window.dispatchEvent(
      new CustomEvent('updateContactForm', {
        detail: {
          subject: `Demande de réservation du ${selectedPeriod.value?.startDate} au ${selectedPeriod.value?.endDate}`,
          message: `Bonjour,\n\nJe souhaite réserver la Maison Dalhia 19 pour la période suivante :\n\nDu ${selectedPeriod.value?.startDate} au ${selectedPeriod.value?.endDate}\n${selectedPeriod.value?.nights ?? 0} nuits\nPrix total : ${formatPrice(selectedPeriod.value?.totalPrice ?? 0)}€\n\nPouvez-vous me confirmer la disponibilité et me donner les informations nécessaires pour la réservation ?\n\nCordialement,`,
        },
      })
    );
  }
};

onMounted(() => {
  fetchBookings();
});
</script>

<template>
  <div class="min-h-screen py-16 bg-background">
    <div class="container-custom">
      <h1 class="text-4xl font-bold text-center text-dark mb-12">Disponibilités</h1>

      <div class="bg-white rounded-xl shadow-lg p-4 sm:p-8">
        <!-- Snackbar -->
        <div
          v-if="showSnackbar"
          class="fixed bottom-4 right-4 bg-primary text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300"
          :class="{
            'translate-y-0 opacity-100': showSnackbar,
            'translate-y-8 opacity-0': !showSnackbar,
          }"
        >
          {{ snackbarMessage }}
        </div>

        <div v-if="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p class="mt-4 text-gray-600">Chargement des disponibilités...</p>
        </div>

        <div v-else class="calendar">
          <div class="flex justify-between items-center mb-8">
            <button class="p-2 rounded-full hover:bg-gray-100" @click="previousMonth">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 class="text-xl font-semibold">{{ monthNames[currentMonth] }} {{ currentYear }}</h2>
            <button class="p-2 rounded-full hover:bg-gray-100" @click="nextMonth">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-7 gap-1 text-center font-medium mb-2">
            <div class="py-2 text-xs sm:text-sm">Lun</div>
            <div class="py-2 text-xs sm:text-sm">Mar</div>
            <div class="py-2 text-xs sm:text-sm">Mer</div>
            <div class="py-2 text-xs sm:text-sm">Jeu</div>
            <div class="py-2 text-xs sm:text-sm">Ven</div>
            <div class="py-2 text-xs sm:text-sm">Sam</div>
            <div class="py-2 text-xs sm:text-sm">Dim</div>
          </div>

          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="(day, index) in calendarDays"
              :key="index"
              class="aspect-square relative"
              @click="
                () => {
                  handleDateClick(day);
                  togglePriceOnMobile(index);
                }
              "
            >
              <div
                class="absolute inset-0.5 flex items-center justify-center rounded-lg transition-colors duration-200"
                :class="{
                  'text-gray-300': !day.isCurrentMonth || !day.isAvailable,
                  'bg-primary/10 text-primary font-medium': day.isBooked && day.isCurrentMonth,
                  'hover:border-2 hover:border-primary cursor-pointer':
                    !day.isBooked && day.isCurrentMonth && day.isAvailable,
                  'text-gray-900': day.isCurrentMonth && !day.isBooked && day.isAvailable,
                  'bg-primary text-white': isDateSelected(day.date),
                  'hover:bg-primary/90': isDateSelected(day.date),
                  'bg-gray-100 cursor-not-allowed': !day.isAvailable && day.isCurrentMonth,
                }"
              >
                <div class="flex flex-col items-center">
                  <span class="text-sm sm:text-base">{{ day.date ? day.date.getDate() : '' }}</span>
                  <span
                    v-if="
                      day.isCurrentMonth &&
                      !day.isBooked &&
                      day.isAvailable &&
                      day.pricePerNight > 0
                    "
                    class="text-[10px] sm:text-xs mt-0.5 hidden sm:inline"
                  >
                    {{ formatPrice(day.pricePerNight) }}€
                  </span>
                  <span
                    v-if="
                      day.isCurrentMonth &&
                      !day.isBooked &&
                      day.isAvailable &&
                      day.pricePerNight > 0 &&
                      showPriceOnMobile === index
                    "
                    class="text-[10px] sm:text-xs mt-0.5 sm:hidden"
                  >
                    {{ formatPrice(day.pricePerNight) }}€
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedPeriod" class="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 class="text-lg font-semibold mb-4">Résumé de votre sélection</h3>
          <div class="space-y-2">
            <p>Du {{ selectedPeriod.startDate }} au {{ selectedPeriod.endDate }}</p>
            <p>{{ selectedPeriod.nights }} nuit{{ selectedPeriod.nights > 1 ? 's' : '' }}</p>

            <!-- Indicateur de chargement du prix -->
            <div v-if="calculatingPrice" class="flex items-center gap-2 text-gray-500">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Calcul du prix...</span>
            </div>

            <!-- Détail des plages tarifaires si plusieurs -->
            <div
              v-else-if="priceCalculation && priceCalculation.details.length > 1"
              class="space-y-1"
            >
              <p class="text-sm text-gray-600 font-medium">Détail par période :</p>
              <div
                v-for="detail in priceCalculation.details"
                :key="detail.seasonId + detail.startDate"
                class="text-sm text-gray-600 pl-2 border-l-2 border-primary/30"
              >
                {{ detail.seasonName }} : {{ detail.nights }} nuit{{
                  detail.nights > 1 ? 's' : ''
                }}
                × {{ formatPrice(detail.pricePerNight) }}€ = {{ formatPrice(detail.subtotal) }}€
              </div>
            </div>

            <p class="text-xl font-bold text-primary">
              Total : {{ formatPrice(selectedPeriod.totalPrice) }}€
            </p>
            <p class="text-sm text-gray-600 italic mt-1">
              Tarif hors taxe de séjour et options complémentaires
            </p>
          </div>
          <button class="btn-primary w-full mt-4" @click="scrollToContact">
            Demander la disponibilité
          </button>
        </div>

        <div class="mt-8 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
          <div class="flex items-center">
            <div class="w-4 h-4 bg-primary/10 border border-primary rounded-full mr-2"></div>
            <span>Réservé</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 border border-gray-300 rounded-full mr-2"></div>
            <span>Disponible</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 bg-primary rounded-full mr-2"></div>
            <span>Sélectionné</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 bg-gray-100 rounded-full mr-2"></div>
            <span>Non disponible</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  max-width: 800px;
  margin: 0 auto;
}

.btn-primary {
  @apply bg-primary text-white px-6 py-3 rounded-lg font-medium
  hover:bg-primary/90 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-primary/50;
}
</style>
