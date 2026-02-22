<script setup lang="ts">
import type { BookingType, BookingSource } from '../../lib/api';
import { SOURCE_LABELS } from '../../constants/booking';

interface Props {
  source: BookingSource | string;
  bookingType: BookingType;
  size?: 'sm' | 'md';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
});

function getBadgeClasses(bookingType: BookingType): string {
  switch (bookingType) {
    case 'EXTERNAL':
      return 'bg-blue-100 text-blue-800';
    case 'PERSONAL':
      return 'bg-purple-100 text-purple-800';
    case 'DIRECT':
      return 'bg-rose-50 text-rose-700';
  }
}

function getDisplayName(): string {
  const source = props.source as BookingSource;
  if (source in SOURCE_LABELS) {
    return SOURCE_LABELS[source];
  }
  return props.source;
}
</script>

<template>
  <span
    :class="[
      getBadgeClasses(bookingType),
      'inline-flex items-center rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
    ]"
  >
    {{ getDisplayName() }}
  </span>
</template>
