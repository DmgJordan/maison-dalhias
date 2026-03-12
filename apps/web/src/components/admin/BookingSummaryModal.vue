<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Booking } from '../../lib/api';
import BaseModal from './BaseModal.vue';
import SourceBadge from './SourceBadge.vue';
import { STATUS_CONFIG } from '../../constants/booking';
import { formatDateLong, countNights } from '../../utils/formatting';

const props = defineProps<{ booking: Booking }>();
const emit = defineEmits<{ close: [] }>();

const router = useRouter();

const title = computed((): string => {
  if (props.booking.primaryClient) {
    return `${props.booking.primaryClient.firstName} ${props.booking.primaryClient.lastName}`;
  }
  return props.booking.label || 'Réservation';
});

const nights = computed((): number =>
  countNights(props.booking.startDate, props.booking.endDate)
);

const statusLabel = computed((): string => {
  return STATUS_CONFIG[props.booking.status].label;
});

const statusColor = computed((): string => {
  return STATUS_CONFIG[props.booking.status].color;
});

const goToDetail = (): void => {
  emit('close');
  router.push(`/admin/reservations/${props.booking.id}`);
};
</script>

<template>
  <BaseModal :title="title" max-width="420px" @close="$emit('close')">
    <!-- Badges source + paiement -->
    <div class="badges-row">
      <SourceBadge
        v-if="booking.source"
        :source="booking.source"
        :booking-type="booking.bookingType"
      />
    </div>

    <!-- Informations -->
    <div class="info-list">
      <div class="info-item">
        <span class="info-label">Arrivée</span>
        <span class="info-value">{{ formatDateLong(booking.startDate) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Départ</span>
        <span class="info-value">{{ formatDateLong(booking.endDate) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Durée</span>
        <span class="info-value"
          >{{ nights }} nuit{{ nights > 1 ? 's' : '' }}</span
        >
      </div>
      <div v-if="booking.occupantsCount" class="info-item">
        <span class="info-label">Occupants</span>
        <span class="info-value"
          >{{ booking.occupantsCount }} personne{{
            booking.occupantsCount > 1 ? 's' : ''
          }}
          ({{ booking.adultsCount }} adulte{{
            booking.adultsCount > 1 ? 's' : ''
          }})</span
        >
      </div>
      <div class="info-item">
        <span class="info-label">Statut</span>
        <span class="status-badge" :style="{ backgroundColor: statusColor + '18', color: statusColor }">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- Actions slot -->
    <template #actions>
      <button class="detail-btn" @click="goToDetail">Voir le détail</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.badges-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #717171;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #222222;
  text-align: right;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge {
  font-weight: 600;
}

.detail-btn {
  width: 100%;
  padding: 12px 24px;
  background-color: #ff385c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
  min-height: 48px;
}

.detail-btn:hover {
  background-color: #e31c5f;
}
</style>
