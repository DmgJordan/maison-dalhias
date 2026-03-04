<script setup lang="ts">
import type { BookingType, BookingSource } from '../../lib/api';
import { SOURCE_LABELS } from '../../constants/booking';

interface Props {
  source: BookingSource | string;
  bookingType: BookingType;
}

const props = defineProps<Props>();

function getBadgeClasses(bookingType: BookingType): string {
  switch (bookingType) {
    case 'EXTERNAL':
      return 'source-badge--external';
    case 'PERSONAL':
      return 'source-badge--personal';
    case 'DIRECT':
      return 'source-badge--direct';
  }
}

function getDisplayName(): string {
  if (props.source === 'DIRECT') {
    return 'Direct';
  }
  const source = props.source as BookingSource;
  if (source in SOURCE_LABELS) {
    return SOURCE_LABELS[source];
  }
  return props.source;
}
</script>

<template>
  <span class="source-badge" :class="getBadgeClasses(bookingType)">
    {{ getDisplayName() }}
  </span>
</template>

<style scoped>
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background-color: rgba(255, 56, 92, 0.07);
  color: #484848;
}

.source-badge::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.source-badge--external::before {
  background-color: #3b82f6;
}

.source-badge--personal::before {
  background-color: #8b5cf6;
}

.source-badge--direct::before {
  background-color: #ff385c;
}
</style>
