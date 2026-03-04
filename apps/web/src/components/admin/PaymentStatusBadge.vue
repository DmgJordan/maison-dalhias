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
      return 'payment-badge--pending';
    case 'PARTIAL':
      return 'payment-badge--partial';
    case 'PAID':
      return 'payment-badge--paid';
    case 'FREE':
      return 'payment-badge--free';
  }
}
</script>

<template>
  <span class="payment-badge" :class="getBadgeClasses(props.status)">
    {{ PAYMENT_STATUS_LABELS[props.status] }}
  </span>
</template>

<style scoped>
.payment-badge {
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

.payment-badge::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.payment-badge--pending::before {
  background-color: #f59e0b;
}

.payment-badge--partial::before {
  background-color: #f97316;
}

.payment-badge--paid::before {
  background-color: #10b981;
}

.payment-badge--free::before {
  background-color: #94a3b8;
}
</style>
