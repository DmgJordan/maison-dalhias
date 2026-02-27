<script setup lang="ts">
import { type Booking } from '../../lib/api';
import { formatClientName } from '../../utils/bookingCapabilities';

const props = defineProps<{
  booking: Booking;
}>();

const formatClientAddress = (client: Booking['primaryClient']): string => {
  if (!client) return '';
  return `${client.address}, ${client.postalCode} ${client.city}`;
};
</script>

<template>
  <section class="detail-section">
    <h2 class="section-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="section-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      Client
    </h2>
    <div class="client-card">
      <div class="client-name">{{ formatClientName(props.booking.primaryClient) }}</div>
      <div v-if="props.booking.primaryClient" class="client-details">
        <p class="client-address">{{ formatClientAddress(props.booking.primaryClient) }}</p>
        <div class="client-contacts">
          <a
            v-if="props.booking.primaryClient.phone"
            :href="`tel:${props.booking.primaryClient.phone}`"
            class="contact-link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="contact-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
              />
            </svg>
            {{ props.booking.primaryClient.phone }}
          </a>
          <span v-if="props.booking.primaryClient.email" class="contact-link contact-link--email">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="contact-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {{ props.booking.primaryClient.email }}
          </span>
        </div>
      </div>
      <div v-if="props.booking.secondaryClient" class="secondary-client">
        <span class="secondary-label">Accompagné de :</span>
        <span class="secondary-name">{{ formatClientName(props.booking.secondaryClient) }}</span>
      </div>
      <div v-if="props.booking.occupantsCount" class="occupants-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="occupants-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span
          >{{ props.booking.occupantsCount }} personne{{
            props.booking.occupantsCount > 1 ? 's' : ''
          }}</span
        >
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Layout (shared pattern — duplicated for scoped isolation) */
.detail-section {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #222222;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: #ff385c;
}

/* Client */
.client-card {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 12px;
}

.client-name {
  font-size: 18px;
  font-weight: 600;
  color: #222222;
  margin-bottom: 8px;
}

.client-details {
  margin-bottom: 12px;
}

.client-address {
  font-size: 14px;
  color: #484848;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.client-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: white;
  border-radius: 8px;
  font-size: 14px;
  color: #484848;
  text-decoration: none;
  transition: all 0.2s;
}

.contact-link:hover {
  background-color: #fff0f3;
  color: #ff385c;
}

.contact-link--email {
  cursor: default;
}

.contact-icon {
  width: 16px;
  height: 16px;
}

.secondary-client {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 0;
  border-top: 1px solid #e5e5e5;
  margin-top: 12px;
}

.secondary-label {
  font-size: 14px;
  color: #717171;
}

.secondary-name {
  font-size: 14px;
  font-weight: 500;
  color: #484848;
}

.occupants-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
  margin-top: 12px;
  font-size: 15px;
  color: #484848;
}

.occupants-icon {
  width: 18px;
  height: 18px;
  color: #717171;
}

@media (min-width: 1024px) {
  .detail-section {
    margin-bottom: 0;
  }
}
</style>
