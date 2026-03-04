<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Booking } from '../../lib/api';
import { normalizeToMidnight } from '../../utils/formatting';
import CalendarBookingBar from './CalendarBookingBar.vue';

interface Props {
  bookings: Booking[];
}

const props = defineProps<Props>();

defineEmits<{ 'booking-click': [booking: Booking] }>();

const now = new Date();
const currentMonth = ref(now.getMonth());
const currentYear = ref(now.getFullYear());

const goToPrevMonth = (): void => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const goToNextMonth = (): void => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

const goToToday = (): void => {
  const today = new Date();
  currentMonth.value = today.getMonth();
  currentYear.value = today.getFullYear();
};

const monthLabel = computed((): string => {
  const date = new Date(currentYear.value, currentMonth.value, 1);
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
});

const weekDaysFull = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const weekDaysShort = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const calendarDays = computed((): CalendarDay[] => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const today = normalizeToMidnight(new Date());

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Jour de la semaine du 1er (0=dim, 1=lun → on veut lun=0)
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const days: CalendarDay[] = [];

  // Jours du mois précédent
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date: normalizeToMidnight(date),
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Jours du mois courant
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const date = new Date(year, month, d);
    const normalized = normalizeToMidnight(date);
    days.push({
      date: normalized,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: normalized.getTime() === today.getTime(),
    });
  }

  // Compléter pour avoir des semaines entières
  const totalCells = days.length <= 35 ? 35 : 42;
  let nextDay = 1;
  while (days.length < totalCells) {
    const date = new Date(year, month + 1, nextDay);
    days.push({
      date: normalizeToMidnight(date),
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: false,
    });
    nextDay++;
  }

  return days;
});

const weekCount = computed((): number => calendarDays.value.length / 7);

// --- Computed: flatBars ---

interface FlatBar {
  booking: Booking;
  startCol: number;
  endCol: number;
  rowIndex: number;
  barIndex: number;
  startsBefore: boolean;
  endsAfter: boolean;
}

const DAY_MS = 86400000;

const flatBars = computed((): FlatBar[] => {
  const days = calendarDays.value;
  if (days.length === 0) return [];

  const gridStart = days[0].date;
  const gridEnd = days[days.length - 1].date;
  const monthStart = normalizeToMidnight(new Date(currentYear.value, currentMonth.value, 1));
  const monthEnd = normalizeToMidnight(new Date(currentYear.value, currentMonth.value + 1, 0));

  const visible = props.bookings.filter((b) => {
    if (b.status === 'CANCELLED') return false;
    const bStart = normalizeToMidnight(new Date(b.startDate));
    const bEnd = normalizeToMidnight(new Date(b.endDate));
    return bStart <= gridEnd && bEnd > gridStart;
  });

  const bars: FlatBar[] = [];
  const weekBarCounts: Record<number, number> = {};

  for (const booking of visible) {
    const bStart = normalizeToMidnight(new Date(booking.startDate));
    const bEnd = normalizeToMidnight(new Date(booking.endDate));

    // Clipper aux bornes de la grille
    const effectiveStart = bStart < gridStart ? gridStart : bStart;
    // endDate est exclusive (jour de départ) → le dernier jour occupé est endDate - 1
    const lastOccupiedDay = new Date(bEnd.getTime() - DAY_MS);
    const effectiveLastDay =
      lastOccupiedDay > gridEnd ? gridEnd : lastOccupiedDay;

    // Trouver les index dans la grille
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < days.length; i++) {
      const t = days[i].date.getTime();
      if (t === effectiveStart.getTime()) startIdx = i;
      if (t === effectiveLastDay.getTime()) endIdx = i;
    }

    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) continue;

    // Découper en segments par semaine
    const startWeek = Math.floor(startIdx / 7);
    const endWeek = Math.floor(endIdx / 7);

    for (let week = startWeek; week <= endWeek; week++) {
      const weekStartIdx = week * 7;
      const weekEndIdx = weekStartIdx + 6;

      const segStart = Math.max(startIdx, weekStartIdx);
      const segEnd = Math.min(endIdx, weekEndIdx);

      const startCol = (segStart % 7) + 1;
      const endCol = (segEnd % 7) + 1;

      const barIndex = weekBarCounts[week] || 0;
      weekBarCounts[week] = barIndex + 1;

      bars.push({
        booking,
        startCol,
        endCol,
        rowIndex: week,
        barIndex,
        startsBefore: bStart < monthStart,
        endsAfter: bEnd > new Date(monthEnd.getTime() + DAY_MS),
      });
    }
  }

  return bars;
});
</script>

<template>
  <div class="calendar">
    <!-- Header navigation -->
    <div class="calendar-header">
      <div class="nav-group">
        <button class="nav-btn" aria-label="Mois précédent" @click="goToPrevMonth">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="nav-icon"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 class="month-label">{{ monthLabel }}</h2>
        <button class="nav-btn" aria-label="Mois suivant" @click="goToNextMonth">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="nav-icon"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <button class="today-btn" @click="goToToday">Aujourd'hui</button>
    </div>

    <!-- En-têtes jours -->
    <div class="calendar-weekdays weekdays--mobile">
      <span v-for="day in weekDaysShort" :key="'s-' + day" class="weekday">{{ day }}</span>
    </div>
    <div class="calendar-weekdays weekdays--desktop">
      <span v-for="day in weekDaysFull" :key="'f-' + day" class="weekday">{{ day }}</span>
    </div>

    <!-- Wrapper avec les 2 couches -->
    <div class="calendar-body">
      <!-- Couche 1 : grille des jours -->
      <div class="calendar-grid">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="calendar-cell"
          :class="{
            'calendar-cell--other-month': !day.isCurrentMonth,
          }"
        >
          <span class="day-number" :class="{ 'day-number--today': day.isToday }">
            {{ day.dayNumber }}
          </span>
        </div>
      </div>

      <!-- Couche 2 : overlay des barres de réservation -->
      <div
        class="calendar-overlay"
        :style="{ gridTemplateRows: `repeat(${weekCount}, 1fr)` }"
      >
        <CalendarBookingBar
          v-for="bar in flatBars"
          :key="bar.booking.id + '-w' + bar.rowIndex"
          :booking="bar.booking"
          :start-col="bar.startCol"
          :end-col="bar.endCol"
          :row-index="bar.rowIndex"
          :bar-index="bar.barIndex"
          :starts-before="bar.startsBefore"
          :ends-after="bar.endsAfter"
          @click="$emit('booking-click', bar.booking)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  background: white;
  border-radius: 12px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* Mobile : viewport - header(64px) - bottomNav(56px+safe) - padding(80+100) */
  height: calc(100vh - 190px);
}

/* Header */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 10px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  color: #484848;
  cursor: pointer;
  transition: all 0.15s;
}

.nav-btn:hover {
  background-color: #f7f7f7;
}

.nav-btn:active {
  background-color: #eee;
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.month-label {
  font-size: 18px;
  font-weight: 700;
  color: #222222;
  margin: 0;
  min-width: 160px;
  text-align: center;
  user-select: none;
}

.today-btn {
  padding: 6px 14px;
  border: 1.5px solid #e5e5e5;
  border-radius: 8px;
  background: white;
  color: #484848;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 36px;
}

.today-btn:hover {
  background-color: #fff0f3;
  border-color: #ff385c;
  color: #ff385c;
}

/* Weekdays */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: #fafafa;
  flex-shrink: 0;
}

.weekday {
  padding: 6px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.weekdays--desktop {
  display: none;
}

.weekdays--mobile {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

@media (min-width: 768px) {
  .weekdays--desktop {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }

  .weekdays--mobile {
    display: none;
  }
}

/* Body wrapper — 2 couches superposées, prend tout l'espace restant */
.calendar-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

/* Couche 1 : grille des jours — remplit 100% du body */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 100%;
}

.calendar-cell {
  padding: 4px 6px;
  border-top: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  background: white;
}

.calendar-cell:nth-child(7n) {
  border-right: none;
}

.calendar-cell--other-month {
  background-color: #fafafa;
}

.calendar-cell--other-month .day-number {
  color: #d1d1d1;
}

.day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  color: #484848;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.day-number--today {
  background-color: #ff385c;
  color: white;
  font-weight: 700;
}

/* Couche 2 : overlay des barres */
.calendar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  pointer-events: none;
}

/* Desktop */
@media (min-width: 768px) {
  .calendar {
    /* Desktop : viewport - padding admin(32px*2 ou 40px*2) */
    height: calc(100vh - 80px);
  }

  .calendar-header {
    padding: 14px 16px 12px;
  }

  .month-label {
    font-size: 20px;
    min-width: 200px;
  }

  .calendar-cell {
    padding: 5px 8px;
  }

  .weekday {
    padding: 8px 0;
    font-size: 12px;
  }

  .day-number {
    font-size: 13px;
    width: 26px;
    height: 26px;
  }
}

@media (min-width: 1024px) {
  .calendar {
    height: calc(100vh - 96px);
  }

  .calendar-header {
    padding: 16px 20px 14px;
  }

  .month-label {
    font-size: 22px;
  }
}
</style>
