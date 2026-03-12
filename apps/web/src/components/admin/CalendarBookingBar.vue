<script setup lang="ts">
import type { Booking, BookingSource } from '../../lib/api';
import { SOURCE_LABELS } from '../../constants/booking';
import { computed } from 'vue';

interface Props {
  booking: Booking;
  startCol: number;
  endCol: number;
  rowIndex: number;
  barIndex: number;
  startsBefore: boolean;
  endsAfter: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  click: [];
}>();

interface BarColors {
  bg: string;
  text: string;
}

function getBarColors(booking: Booking): BarColors {
  if (booking.bookingType === 'PERSONAL')
    return { bg: '#E5E7EB', text: '#4B5563' };
  switch (booking.source) {
    case 'AIRBNB':
      return { bg: '#FECDD3', text: '#9F1239' };
    case 'ABRITEL':
      return { bg: '#BFDBFE', text: '#1E40AF' };
    case 'BOOKING_COM':
      return { bg: '#C7D2FE', text: '#3730A3' };
    case 'OTHER':
      return { bg: '#FDE68A', text: '#92400E' };
    default:
      return { bg: '#FFE4E9', text: '#BE123C' };
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'FULLY_PAID':
      return '✓';
    case 'DEPOSIT_PAID':
      return '€';
    case 'CONTRACT_SENT':
      return '✉';
    case 'VALIDATED':
      return '✓';
    case 'CANCELLED':
      return '✗';
    default:
      return '⏳';
  }
}

function getBarLabel(booking: Booking): string {
  let name: string;
  if (booking.primaryClient) {
    name = `${booking.primaryClient.firstName} ${booking.primaryClient.lastName}`;
  } else {
    name = booking.label || '—';
  }
  const source = booking.source ? SOURCE_LABELS[booking.source as BookingSource] : 'Direct';
  return `${name} · ${source}`;
}

const barStyle = computed(() => {
  const colors = getBarColors(props.booking);

  let borderRadius = '4px';
  if (props.startsBefore && props.endsAfter) {
    borderRadius = '0';
  } else if (props.startsBefore) {
    borderRadius = '0 4px 4px 0';
  } else if (props.endsAfter) {
    borderRadius = '4px 0 0 4px';
  }

  const topOffset = 26 + props.barIndex * 22;

  return {
    gridColumn: `${props.startCol} / ${props.endCol + 1}`,
    gridRow: `${props.rowIndex + 1}`,
    marginTop: `${topOffset}px`,
    marginLeft: '1px',
    marginRight: '1px',
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius,
  };
});

const label = computed(() => getBarLabel(props.booking));
const statusIcon = computed(() => getStatusIcon(props.booking.status));
</script>

<template>
  <div class="booking-bar" :style="barStyle" @click="$emit('click')">
    <span v-if="startsBefore" class="bar-chevron">«</span>
    <span class="bar-label">{{ label }}</span>
    <span class="bar-status">{{ statusIcon }}</span>
    <span v-if="endsAfter" class="bar-chevron">»</span>
  </div>
</template>

<style scoped>
.booking-bar {
  height: 20px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  z-index: 2;
  transition: all 0.15s;
  pointer-events: auto;
  align-self: start;
}

.booking-bar:hover {
  filter: brightness(0.92);
}

.bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  line-height: 1;
}

.bar-status {
  flex-shrink: 0;
  font-size: 10px;
}

.bar-chevron {
  flex-shrink: 0;
  font-size: 9px;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .booking-bar {
    height: 16px;
    font-size: 9px;
    padding: 0 4px;
  }
}
</style>
