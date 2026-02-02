<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

interface Props {
  modelValue: string;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'Selectionnez une date',
  minDate: '',
  maxDate: '',
  disabledDates: () => [],
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isOpen = ref(false);
const currentMonth = ref(new Date());
const triggerRef = ref<HTMLButtonElement | null>(null);
const dropdownRef = ref<HTMLDivElement | null>(null);
const dropdownStyle = ref<{ top: string; left: string; width: string }>({
  top: '0px',
  left: '0px',
  width: '340px',
});

// Initialiser le mois courant base sur la valeur ou minDate
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      currentMonth.value = new Date(newValue);
    } else if (props.minDate) {
      currentMonth.value = new Date(props.minDate);
    }
  },
  { immediate: true }
);

watch(
  () => props.minDate,
  (newMin) => {
    if (newMin && !props.modelValue) {
      const minDateObj = new Date(newMin);
      if (currentMonth.value < minDateObj) {
        currentMonth.value = new Date(minDateObj);
      }
    }
  }
);

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const monthNames = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
];

const currentMonthLabel = computed((): string => {
  return `${monthNames[currentMonth.value.getMonth()]} ${currentMonth.value.getFullYear()}`;
});

const formattedValue = computed((): string => {
  if (!props.modelValue) return '';
  const date = new Date(props.modelValue);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Ajuster pour commencer le lundi (0 = lundi, 6 = dimanche)
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days: Array<{
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isDisabled: boolean;
    isPast: boolean;
  }> = [];

  // Jours du mois precedent
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    days.push(createDayObject(date, false));
  }

  // Jours du mois courant
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    days.push(createDayObject(date, true));
  }

  // Jours du mois suivant
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push(createDayObject(date, false));
  }

  return days;
});

const createDayObject = (date: Date, isCurrentMonth: boolean) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateClone = new Date(date.getTime());
  dateClone.setHours(0, 0, 0, 0);

  const dateString = formatDateToString(dateClone);
  const isSelected = props.modelValue === dateString;
  const isPast = dateClone < today;

  let isDisabled = isPast;

  if (props.minDate) {
    const minDateObj = new Date(props.minDate);
    minDateObj.setHours(0, 0, 0, 0);
    if (dateClone < minDateObj) isDisabled = true;
  }

  if (props.maxDate) {
    const maxDateObj = new Date(props.maxDate);
    maxDateObj.setHours(0, 0, 0, 0);
    if (dateClone > maxDateObj) isDisabled = true;
  }

  if (props.disabledDates.includes(dateString)) {
    isDisabled = true;
  }

  return {
    date: dateClone,
    day: dateClone.getDate(),
    isCurrentMonth,
    isToday: dateClone.getTime() === today.getTime(),
    isSelected,
    isDisabled,
    isPast,
  };
};

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const canGoPrevMonth = computed((): boolean => {
  if (!props.minDate) return true;
  const minDateObj = new Date(props.minDate);
  const prevMonth = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
  return prevMonth >= new Date(minDateObj.getFullYear(), minDateObj.getMonth(), 1);
});

const goPrevMonth = (): void => {
  if (!canGoPrevMonth.value) return;
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
};

const goNextMonth = (): void => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  );
};

const selectDate = (day: (typeof calendarDays.value)[0]): void => {
  if (day.isDisabled) return;
  const dateString = formatDateToString(day.date);
  emit('update:modelValue', dateString);
  isOpen.value = false;
};

const updateDropdownPosition = (): void => {
  if (!triggerRef.value) return;

  const rect = triggerRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const dropdownHeight = 380; // Hauteur approximative du calendrier
  const dropdownWidth = 340;

  // Toujours ouvrir en dessous par defaut
  let top = rect.bottom + 8;
  let left = rect.left;

  // Seulement si vraiment pas de place en bas ET place en haut, ouvrir au-dessus
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
    top = rect.top - dropdownHeight - 8;
  } else {
    // Sinon, garder en bas mais s'assurer qu'il reste visible
    top = rect.bottom + 8;
  }

  // Si le dropdown depasse a droite, l'aligner a droite du bouton
  if (left + dropdownWidth > viewportWidth - 20) {
    left = rect.right - dropdownWidth;
  }

  // S'assurer qu'il ne depasse pas a gauche
  if (left < 20) {
    left = 20;
  }

  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${Math.min(dropdownWidth, viewportWidth - 40)}px`,
  };
};

const toggleCalendar = async (): Promise<void> => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;

  if (isOpen.value) {
    await nextTick();
    updateDropdownPosition();
  }
};

const closeCalendar = (): void => {
  isOpen.value = false;
};

const clearDate = (): void => {
  emit('update:modelValue', '');
};

const handleClickOutside = (event: MouseEvent): void => {
  if (!isOpen.value) return;

  const target = event.target as Node;
  if (triggerRef.value?.contains(target) || dropdownRef.value?.contains(target)) {
    return;
  }
  closeCalendar();
};

const handleScroll = (): void => {
  if (isOpen.value) {
    updateDropdownPosition();
  }
};

const handleResize = (): void => {
  if (isOpen.value) {
    updateDropdownPosition();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', handleScroll, true);
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="date-picker" :class="{ 'date-picker--disabled': disabled }">
    <label v-if="label" class="date-picker-label">{{ label }}</label>

    <!-- Bouton d'ouverture -->
    <button
      ref="triggerRef"
      type="button"
      class="date-picker-trigger"
      :class="{ 'date-picker-trigger--open': isOpen, 'date-picker-trigger--filled': modelValue }"
      :disabled="disabled"
      @click="toggleCalendar"
    >
      <div class="trigger-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="trigger-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span v-if="modelValue" class="trigger-value">{{ formattedValue }}</span>
        <span v-else class="trigger-placeholder">{{ placeholder }}</span>
      </div>
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="trigger-clear"
        @click.stop="clearDate"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </button>

    <!-- Calendrier dropdown -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div v-if="isOpen" ref="dropdownRef" class="date-picker-dropdown" :style="dropdownStyle">
          <!-- Header du calendrier -->
          <div class="calendar-header">
            <button
              type="button"
              class="calendar-nav"
              :disabled="!canGoPrevMonth"
              @click="goPrevMonth"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="calendar-month">{{ currentMonthLabel }}</span>
            <button type="button" class="calendar-nav" @click="goNextMonth">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <!-- Jours de la semaine -->
          <div class="calendar-weekdays">
            <span v-for="day in weekDays" :key="day" class="weekday">{{ day }}</span>
          </div>

          <!-- Grille des jours -->
          <div class="calendar-grid">
            <button
              v-for="(day, index) in calendarDays"
              :key="index"
              type="button"
              class="calendar-day"
              :class="{
                'calendar-day--other-month': !day.isCurrentMonth,
                'calendar-day--today': day.isToday,
                'calendar-day--selected': day.isSelected,
                'calendar-day--disabled': day.isDisabled,
              }"
              :disabled="day.isDisabled"
              @click="selectDate(day)"
            >
              {{ day.day }}
            </button>
          </div>

          <!-- Bouton fermer (mobile) -->
          <button type="button" class="calendar-close" @click="closeCalendar">Fermer</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.date-picker {
  position: relative;
}

.date-picker--disabled {
  opacity: 0.6;
}

.date-picker-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #484848;
  margin-bottom: 8px;
}

/* Bouton trigger */
.date-picker-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background-color: white;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.date-picker-trigger:hover:not(:disabled) {
  border-color: #d4d4d4;
}

.date-picker-trigger--open {
  border-color: #ff385c;
}

.date-picker-trigger--filled {
  border-color: #10b981;
  background-color: #f0fdf4;
}

.date-picker-trigger:disabled {
  cursor: not-allowed;
  background-color: #f7f7f7;
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.trigger-icon {
  width: 22px;
  height: 22px;
  color: #717171;
  flex-shrink: 0;
}

.date-picker-trigger--filled .trigger-icon {
  color: #10b981;
}

.trigger-value {
  font-size: 15px;
  color: #222222;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-placeholder {
  font-size: 15px;
  color: #a3a3a3;
}

.trigger-clear {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.trigger-clear:hover {
  background-color: #fee2e2;
}

.trigger-clear svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

.trigger-clear:hover svg {
  color: #dc2626;
}

/* Dropdown */
.date-picker-dropdown {
  position: fixed;
  z-index: 1000;
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e5e5;
}

/* Header calendrier */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.calendar-nav {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f7f7f7;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-nav:hover:not(:disabled) {
  background-color: #e5e5e5;
}

.calendar-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.calendar-nav svg {
  width: 20px;
  height: 20px;
  color: #484848;
}

.calendar-month {
  font-size: 17px;
  font-weight: 700;
  color: #222222;
}

/* Jours de la semaine */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #717171;
  padding: 8px 0;
}

/* Grille des jours */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 500;
  color: #222222;
  background-color: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 40px;
}

.calendar-day:hover:not(:disabled):not(.calendar-day--selected) {
  background-color: #f7f7f7;
}

.calendar-day--other-month {
  color: #d4d4d4;
}

.calendar-day--today {
  background-color: #fff0f3;
  color: #ff385c;
  font-weight: 700;
}

.calendar-day--selected {
  background-color: #ff385c;
  color: white;
  font-weight: 700;
}

.calendar-day--disabled {
  color: #e5e5e5;
  cursor: not-allowed;
  text-decoration: line-through;
}

.calendar-day--disabled.calendar-day--other-month {
  color: #f0f0f0;
}

/* Bouton fermer */
.calendar-close {
  width: 100%;
  padding: 14px;
  margin-top: 16px;
  background-color: #f7f7f7;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #484848;
  cursor: pointer;
  transition: all 0.2s;
  display: none;
}

.calendar-close:hover {
  background-color: #e5e5e5;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Mobile : afficher le bouton fermer */
@media (max-width: 767px) {
  .calendar-close {
    display: block;
  }
}
</style>
