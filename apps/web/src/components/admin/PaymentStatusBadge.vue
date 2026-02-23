<script setup lang="ts">
import type { PaymentStatus } from '../../lib/api';
import { PAYMENT_STATUS_LABELS } from '../../constants/booking';

interface Props {
  status: PaymentStatus;
}

const props = defineProps<Props>();

function getBadgeClasses(status: PaymentStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-orange-100 text-orange-800';
    case 'PARTIAL':
      return 'bg-amber-100 text-amber-800';
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800';
    case 'FREE':
      return 'bg-slate-100 text-slate-600';
  }
}
</script>

<template>
  <span
    :class="[
      getBadgeClasses(props.status),
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
    ]"
  >
    {{ PAYMENT_STATUS_LABELS[props.status] }}
  </span>
</template>
