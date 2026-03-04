<script setup lang="ts">
import type { BookingType } from '../../lib/api';
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
    <div class="recap-banner__left">
      <span class="recap-banner__source">{{ source }}</span>
      <span class="recap-banner__sep">·</span>
      <span class="recap-banner__dates">
        {{ formatDateShort(startDate) }} — {{ formatDateShort(endDate) }}
      </span>
      <span class="recap-banner__sep">·</span>
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
  padding: 14px 16px;
  background-color: white;
  border: 1px solid #ebebeb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.recap-banner__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.recap-banner__source {
  font-size: 14px;
  font-weight: 600;
  color: #222222;
}

.recap-banner__sep {
  color: #d4d4d4;
  font-size: 14px;
}

.recap-banner__dates {
  font-size: 14px;
  color: #484848;
}

.recap-banner__nights {
  font-size: 13px;
  color: #9ca3af;
}

.recap-banner__edit {
  font-size: 13px;
  font-weight: 600;
  color: #ff385c;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}

.recap-banner__edit:hover {
  background-color: #fff0f3;
}
</style>
