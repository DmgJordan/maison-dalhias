<script setup lang="ts">
import type { BookingType } from '../../lib/api';
import SourceBadge from './SourceBadge.vue';
import { formatDateShort } from '../../utils/formatting';

interface Props {
  source: string;
  bookingType: BookingType;
  startDate: string;
  endDate: string;
  nightsCount: number;
}

defineProps<Props>();
const emit = defineEmits<{ edit: [] }>();
</script>

<template>
  <div class="recap-banner">
    <div class="recap-banner__info">
      <SourceBadge :source="source" :booking-type="bookingType" />
      <span class="recap-banner__dates">
        {{ formatDateShort(startDate) }} — {{ formatDateShort(endDate) }}
      </span>
      <span class="recap-banner__nights">
        {{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}
      </span>
    </div>
    <button type="button" class="recap-banner__edit" @click="emit('edit')">Modifier</button>
  </div>
</template>

<style scoped>
.recap-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background-color: #f7f7f7;
  border-radius: 12px;
  padding: 16px;
}

.recap-banner__info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.recap-banner__dates {
  font-size: 15px;
  color: #484848;
}

.recap-banner__nights {
  font-size: 14px;
  color: #717171;
}

.recap-banner__edit {
  font-size: 14px;
  font-weight: 500;
  color: #ff385c;
  background: none;
  border: none;
  cursor: pointer;
  min-height: 48px;
  padding: 0 4px;
  transition: all 0.2s;
}

.recap-banner__edit:hover {
  text-decoration: underline;
}
</style>
