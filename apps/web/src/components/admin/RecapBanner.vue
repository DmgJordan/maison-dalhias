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
  <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-4">
    <div class="flex flex-wrap items-center gap-3">
      <SourceBadge :source="source" :booking-type="bookingType" />
      <span class="text-sm text-dark">
        {{ formatDateShort(startDate) }} — {{ formatDateShort(endDate) }}
      </span>
      <span class="text-sm text-gray-500">
        {{ nightsCount }} nuit{{ nightsCount > 1 ? 's' : '' }}
      </span>
    </div>
    <button
      type="button"
      class="text-sm font-medium text-primary hover:underline"
      style="min-height: 48px"
      @click="emit('edit')"
    >
      Modifier
    </button>
  </div>
</template>
