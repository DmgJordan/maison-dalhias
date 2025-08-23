<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

interface BookedDate {
  start: Date;
  end: Date;
  label: string;
  status: string;
}

interface PricingPeriod {
  name: string;
  dates: string;
  price: number;
  pricePerNight: number;
}

const MIN_STAY_DAYS = 3;
const bookedDates = ref<BookedDate[]>([]);
const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const calendarDays = ref<Array<{ date: Date | null, isCurrentMonth: boolean, isBooked: boolean, isAvailable: boolean }>>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedStartDate = ref<Date | null>(null);
const selectedEndDate = ref<Date | null>(null);
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const showPriceOnMobile = ref<number | null>(null);

const togglePriceOnMobile = (dayIndex: number) => {
  if (showPriceOnMobile.value === dayIndex) {
    showPriceOnMobile.value = null;
  } else {
    showPriceOnMobile.value = dayIndex;
  }
};

const pricingPeriods = ref<PricingPeriod[]>([
  {
    name: 'Hors Saison',
    dates: 'Du 1 Mai au 28 Juin / Du 30 Août au 27 Septembre',
    price: 400,
    pricePerNight: 80
  },
  {
    name: 'Début et Fin d\'Été',
    dates: 'Du 28 Juin au 13 Juillet / Du 23 Août au 30 Août',
    price: 650,
    pricePerNight: 120
  },
  {
    name: 'Période Estivale',
    dates: 'Du 13 Juillet au 26 Juillet',
    price: 750,
    pricePerNight: 150
  },
  {
    name: 'Cœur de l\'Été',
    dates: 'Du 26 Juillet au 23 Août',
    price: 950,
    pricePerNight: 180
  }
]);

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
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

const isDateAvailable = (date: Date): boolean => {
  // Vérifier si la date est dans le passé (avant aujourd'hui)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normaliser à minuit

  if (date < today) {
    return false; // Date dans le passé, donc non disponible
  }

  // Vérification mise à jour selon les nouvelles périodes
  const month = date.getMonth();
  const day = date.getDate();

  return (
      // Hors Saison: 1 Mai au 28 Juin / 30 Août au 27 Septembre
      ((month === 4 && day >= 1) || (month === 5 && day <= 28) ||
          (month === 7 && day >= 30) || (month === 8 && day <= 27)) ||
      // Début et Fin d'Été: 28 Juin au 13 Juillet / 23 Août au 30 Août
      ((month === 5 && day >= 28) || (month === 6 && day <= 13) ||
          (month === 7 && day >= 23 && day <= 30)) ||
      // Période Estivale: 13 Juillet au 26 Juillet
      (month === 6 && day > 13 && day <= 26) ||
      // Cœur de l'Été: 26 Juillet au 23 Août
      ((month === 6 && day > 26) || (month === 7 && day <= 23))
  );
};

const fetchBookings = async () => {
  try {
    loading.value = true;
    const { data, error: err } = await supabase
        .from('bookings')
        .select('start_date, end_date, status')
        .order('start_date', { ascending: true });

    if (err) throw err;

    // Ajout de log pour vérifier les données reçues
    console.log('Réservations récupérées:', data);

    bookedDates.value = data.map(booking => {
      // Conversion explicite des chaînes de dates en objets Date
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);

      return {
        start,
        end,
        label: 'Réservé',
        status: booking.status
      };
    });

    // Vérification des dates après conversion
    console.log('Dates réservées après conversion:', bookedDates.value);

    generateCalendar();
  } catch (err) {
    console.error('Erreur lors de la récupération des réservations:', err);
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};

const generateCalendar = () => {
  const firstDayOfMonth = new Date(currentYear.value, currentMonth.value, 1);
  const lastDayOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0);

  let startDay = new Date(firstDayOfMonth);
  startDay.setDate(startDay.getDate() - (startDay.getDay() === 0 ? 6 : startDay.getDay() - 1));

  const days = [];

  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDay);
    currentDate.setDate(startDay.getDate() + i);

    // Vérification explicite de la réservation
    const isBooked = isDateBooked(currentDate);
    const isAvailable = isDateAvailable(currentDate);

    days.push({
      date: currentDate,
      isCurrentMonth: currentDate.getMonth() === currentMonth.value,
      isBooked, // Status de réservation
      isAvailable // Disponibilité selon les saisons
    });

    if (currentDate > lastDayOfMonth && i >= 35) break;
  }

  calendarDays.value = days;
};

const isDateBooked = (date: Date): boolean => {
  if (!date) return false;

  // Normalisation de la date d'entrée (minuit)
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  for (const booking of bookedDates.value) {
    // Normalisation des dates de début et de fin (minuit)
    const startDate = new Date(booking.start.getFullYear(), booking.start.getMonth(), booking.start.getDate());
    const endDate = new Date(booking.end.getFullYear(), booking.end.getMonth(), booking.end.getDate());

    // Modification: Ne considère plus la date de fin comme réservée
    // La date est réservée si elle est entre la date de début (incluse) et la date de fin (non incluse)
    if (checkDate >= startDate && checkDate < endDate) {
      return true;
    }
  }

  return false;
};

// Modification de la fonction handleDateClick pour vérifier les dates réservées
const handleDateClick = (day: { date: Date, isBooked: boolean, isCurrentMonth: boolean, isAvailable: boolean }) => {
  // Vérifications existantes pour les dates non disponibles
  if (!day.isCurrentMonth || day.isBooked || !day.isAvailable) {
    if (!day.isAvailable) {
      showNotification("Cette date n'est pas disponible à la réservation");
    } else if (day.isBooked) {
      showNotification("Cette date est déjà réservée");
    }
    return;
  }

  const clickedDate = new Date(day.date);

  if (!selectedStartDate.value || (selectedStartDate.value && selectedEndDate.value)) {
    // Sélection d'une nouvelle date de début
    selectedStartDate.value = clickedDate;
    selectedEndDate.value = null;
  } else {
    // Sélection d'une date de fin
    if (clickedDate < selectedStartDate.value) {
      // Si la date sélectionnée est avant la date de début, on en fait la nouvelle date de début
      selectedStartDate.value = clickedDate;
    } else {
      // Vérification de la durée minimale
      const daysDifference = Math.ceil(
          (clickedDate.getTime() - selectedStartDate.value.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference < MIN_STAY_DAYS) {
        showNotification(`La durée minimum de séjour est de ${MIN_STAY_DAYS} nuits`);
        return;
      }

      // Vérification des dates réservées dans la plage sélectionnée
      let hasBookedDateInRange = false;
      let currentDate = new Date(selectedStartDate.value);

      while (currentDate <= clickedDate) {
        // Vérifier si la date est déjà réservée
        if (isDateBooked(currentDate)) {
          hasBookedDateInRange = true;
          break;
        }

        // Vérifier si la date est disponible (selon les saisons)
        if (!isDateAvailable(currentDate)) {
          showNotification("Certaines dates sélectionnées ne sont pas disponibles à la réservation");
          return;
        }

        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Si une date réservée a été trouvée dans la plage
      if (hasBookedDateInRange) {
        showNotification("Votre sélection inclut des dates déjà réservées");
        return;
      }

      // Tout est OK, on peut définir la date de fin
      selectedEndDate.value = clickedDate;
    }
  }
};
const previousMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
  generateCalendar();
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
  generateCalendar();
};

const isDateSelected = (date: Date | null) => {
  if (!date) return false;
  if (!selectedStartDate.value) return false;

  if (selectedEndDate.value) {
    return date >= selectedStartDate.value && date <= selectedEndDate.value;
  }

  return date.getTime() === selectedStartDate.value.getTime();
};

const getPriceForDate = (date: Date): number => {
  if (!isDateAvailable(date)) return 0;

  const month = date.getMonth();
  const day = date.getDate();

  // Mise à jour des prix selon les nouvelles périodes
  // Hors Saison - 80€/nuit
  if ((month === 4 && day >= 1) || (month === 5 && day <= 28) ||
      (month === 7 && day >= 30) || (month === 8 && day <= 27)) {
    return 80;
  }
  // Début et Fin d'Été - 120€/nuit
  else if ((month === 5 && day >= 28) || (month === 6 && day <= 13) ||
      (month === 7 && day >= 23 && day <= 30)) {
    return 120;
  }
  // Période Estivale - 150€/nuit
  else if (month === 6 && day > 13 && day <= 26) {
    return 150;
  }
  // Cœur de l'Été - 180€/nuit
  else if ((month === 6 && day > 26) || (month === 7 && day <= 23)) {
    return 180;
  }

  return 0;
};

const getWeeklyRate = (startDate: Date, endDate: Date): number => {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let highestWeeklyRate = 0;

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const period = pricingPeriods.value.find(p => {
      const month = currentDate.getMonth();
      const day = currentDate.getDate();

      // Hors Saison
      if ((month === 4 && day >= 1) || (month === 5 && day <= 28) ||
          (month === 7 && day >= 30) || (month === 8 && day <= 27)) {
        return p.name === 'Hors Saison';
      }
      // Début et Fin d'Été
      else if ((month === 5 && day >= 28) || (month === 6 && day <= 13) ||
          (month === 7 && day >= 23 && day <= 30)) {
        return p.name === 'Début et Fin d\'Été';
      }
      // Période Estivale
      else if (month === 6 && day > 13 && day <= 26) {
        return p.name === 'Période Estivale';
      }
      // Cœur de l'Été
      else if ((month === 6 && day > 26) || (month === 7 && day <= 23)) {
        return p.name === 'Cœur de l\'Été';
      }
      return false;
    });

    if (period && period.price > highestWeeklyRate) {
      highestWeeklyRate = period.price;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  const dailyRate = highestWeeklyRate / 7;
  return Number((dailyRate * days).toFixed(2));
};

const calculateTotalPrice = computed(() => {
  if (!selectedStartDate.value || !selectedEndDate.value) return 0;

  const days = Math.ceil(
      (selectedEndDate.value.getTime() - selectedStartDate.value.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days >= 7) {
    return getWeeklyRate(selectedStartDate.value, selectedEndDate.value);
  }

  let highestDailyRate = 0;
  let currentDate = new Date(selectedStartDate.value);

  while (currentDate <= selectedEndDate.value) {
    const dailyRate = getPriceForDate(currentDate);
    if (dailyRate > highestDailyRate) {
      highestDailyRate = dailyRate;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return Number((highestDailyRate * days).toFixed(2));
});

const selectedPeriod = computed(() => {
  if (!selectedStartDate.value || !selectedEndDate.value) return null;

  const nights = Math.ceil((selectedEndDate.value.getTime() - selectedStartDate.value.getTime()) / (1000 * 60 * 60 * 24));
  const startDateStr = selectedStartDate.value.toLocaleDateString('fr-FR');
  const endDateStr = selectedEndDate.value.toLocaleDateString('fr-FR');

  return {
    nights,
    startDate: startDateStr,
    endDate: endDateStr,
    totalPrice: calculateTotalPrice.value
  };
});

const scrollToContact = () => {
  const contactForm = document.getElementById('contact');
  if (contactForm) {
    contactForm.scrollIntoView({ behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('updateContactForm', {
      detail: {
        subject: `Demande de réservation du ${selectedPeriod.value?.startDate} au ${selectedPeriod.value?.endDate}`,
        message: `Bonjour,\n\nJe souhaite réserver la Maison Dalhia 19 pour la période suivante :\n\nDu ${selectedPeriod.value?.startDate} au ${selectedPeriod.value?.endDate}\n${selectedPeriod.value?.nights ?? 0} nuits\nPrix total : ${formatPrice(selectedPeriod.value?.totalPrice ?? 0)}€\n\nPouvez-vous me confirmer la disponibilité et me donner les informations nécessaires pour la réservation ?\n\nCordialement,`
      }
    }));
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
        <div v-if="showSnackbar"
             class="fixed bottom-4 right-4 bg-primary text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300"
             :class="{ 'translate-y-0 opacity-100': showSnackbar, 'translate-y-8 opacity-0': !showSnackbar }">
          {{ snackbarMessage }}
        </div>

        <div v-if="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p class="mt-4 text-gray-600">Chargement des disponibilités...</p>
        </div>

        <div v-else class="calendar">
          <div class="flex justify-between items-center mb-8">
            <button @click="previousMonth" class="p-2 rounded-full hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 class="text-xl font-semibold">{{ monthNames[currentMonth] }} {{ currentYear }}</h2>
            <button @click="nextMonth" class="p-2 rounded-full hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
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
            <div v-for="(day, index) in calendarDays"
                 :key="index"
                 class="aspect-square relative"
                 @click="() => {
                   handleDateClick(day);
                   togglePriceOnMobile(index);
                 }">
              <div
                  class="absolute inset-0.5 flex items-center justify-center rounded-lg transition-colors duration-200"
                  :class="{
                  'text-gray-300': !day.isCurrentMonth || !day.isAvailable,
                  'bg-primary/10 text-primary font-medium': day.isBooked && day.isCurrentMonth,
                  'hover:border-2 hover:border-primary cursor-pointer': !day.isBooked && day.isCurrentMonth && day.isAvailable,
                  'text-gray-900': day.isCurrentMonth && !day.isBooked && day.isAvailable,
                  'bg-primary text-white': isDateSelected(day.date),
                  'hover:bg-primary/90': isDateSelected(day.date),
                  'bg-gray-100 cursor-not-allowed': !day.isAvailable && day.isCurrentMonth
                }"
              >
                <div class="flex flex-col items-center">
                  <span class="text-sm sm:text-base">{{ day.date ? day.date.getDate() : '' }}</span>
                  <span v-if="(day.isCurrentMonth && !day.isBooked && day.isAvailable) &&
                            (showPriceOnMobile === index || $window?.innerWidth >= 640)"
                        class="text-[10px] sm:text-xs mt-0.5">
            {{ selectedPeriod?.totalPrice ?? formatPrice(getPriceForDate(day.date)) }}€

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
            <p class="text-xl font-bold text-primary">Total : {{ formatPrice(selectedPeriod.totalPrice) }}€</p>
            <p class="text-sm text-gray-600 italic mt-1">Tarif hors taxe de séjour et options complémentaires</p>
          </div>
          <button @click="scrollToContact" class="btn-primary w-full mt-4">
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
