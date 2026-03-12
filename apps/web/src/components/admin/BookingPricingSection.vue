<script setup lang="ts">
import { type Booking, type PriceCalculation } from '../../lib/api';
import { formatPrice } from '../../utils/formatting';
import { OPTION_PRICES } from '../../constants/pricing';

defineProps<{
  booking: Booking;
  nightsCount: number;
  hasRentalPrice: boolean;
  hasExternalAmount: boolean;
  sourceDisplayName: string;
  cleaningPrice: number;
  linenPrice: number;
  touristTaxPrice: number;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  priceCalculation: PriceCalculation | null;
  priceMismatch: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  'update-price': [];
}>();
</script>

<template>
  <section v-if="hasRentalPrice || hasExternalAmount" class="detail-section">
    <h2 class="section-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="section-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
      {{ hasRentalPrice ? 'Tarifs' : 'Montant' }}
    </h2>

    <!-- Full price breakdown (DIRECT bookings with rentalPrice) -->
    <template v-if="hasRentalPrice">
      <div class="price-card">
        <div class="price-line">
          <span class="price-label">Location ({{ nightsCount }} nuits)</span>
          <span class="price-value">{{ formatPrice(Number(booking.rentalPrice ?? 0)) }}</span>
        </div>
        <div v-if="booking.cleaningIncluded" class="price-line">
          <span class="price-label">Ménage fin de séjour</span>
          <span v-if="booking.cleaningOffered" class="price-offered">Offert</span>
          <span v-else class="price-value">{{ formatPrice(cleaningPrice) }}</span>
        </div>
        <div v-if="booking.linenIncluded" class="price-line">
          <span class="price-label"
            >Linge de maison ({{ booking.occupantsCount ?? '-' }} pers.)</span
          >
          <span v-if="booking.linenOffered" class="price-offered">Offert</span>
          <span v-else class="price-value">{{ formatPrice(linenPrice) }}</span>
        </div>
        <div v-if="booking.touristTaxIncluded" class="price-line">
          <span class="price-label">Taxe de séjour</span>
          <span class="price-value">{{ formatPrice(touristTaxPrice) }}</span>
        </div>
        <div class="price-line price-line--total">
          <span class="price-label">Total</span>
          <span class="price-value">{{ formatPrice(totalPrice) }}</span>
        </div>
      </div>

      <!-- Avertissement prix incoherent -->
      <div
        v-if="priceMismatch && priceCalculation && booking.status === 'DRAFT'"
        class="price-warning"
      >
        <div class="price-warning-text">
          <strong>Prix potentiellement incorrect</strong>
          <p>
            Prix stocké : {{ formatPrice(Number(booking.rentalPrice ?? 0)) }} | Prix recalculé :
            {{ formatPrice(priceCalculation.totalPrice) }}
          </p>
        </div>
        <button class="price-warning-btn" :disabled="loading" @click="emit('update-price')">
          Mettre à jour
        </button>
      </div>

      <!-- Detail tarifaire -->
      <div v-if="priceCalculation && priceCalculation.details.length > 0" class="price-breakdown">
        <h3 class="breakdown-title">Détail du calcul</h3>
        <div
          v-for="detail in priceCalculation.details"
          :key="detail.seasonId + detail.startDate"
          class="breakdown-line"
        >
          <span
            >{{ detail.nights }} nuit{{ detail.nights > 1 ? 's' : '' }}
            {{ detail.seasonName }}</span
          >
          <span
            >{{ detail.nights }} x {{ formatPrice(detail.pricePerNight) }}/nuit =
            {{ formatPrice(detail.subtotal) }}</span
          >
        </div>
        <p v-if="priceCalculation.isWeeklyRate" class="breakdown-note">
          Tarif hebdomadaire appliqué
        </p>
      </div>

      <!-- Échéances -->
      <div class="payment-schedule">
        <h3 class="schedule-title">Échéances de paiement</h3>
        <div class="schedule-item">
          <span class="schedule-label">Acompte (30%)</span>
          <span class="schedule-value">{{ formatPrice(depositAmount) }}</span>
        </div>
        <div class="schedule-item">
          <span class="schedule-label">Solde (15 jours avant)</span>
          <span class="schedule-value">{{ formatPrice(balanceAmount) }}</span>
        </div>
        <div class="schedule-item schedule-item--deposit">
          <span class="schedule-label">Dépôt de garantie</span>
          <span class="schedule-value"
            >{{ OPTION_PRICES.SECURITY_DEPOSIT }} € (chèque non encaissé)</span
          >
        </div>
      </div>
    </template>

    <!-- Simplified external amount (quick bookings without rentalPrice) -->
    <template v-else-if="hasExternalAmount">
      <div class="price-card">
        <div class="price-line">
          <span class="price-label">Reçu de {{ sourceDisplayName }}</span>
          <span class="price-value">{{ formatPrice(Number(booking.externalAmount ?? 0)) }}</span>
        </div>
      </div>
    </template>
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

/* Tarifs */
.price-card {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.price-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e8e8e8;
}

.price-line:last-child {
  border-bottom: none;
}

.price-line--total {
  border-top: 2px solid #222222;
  margin-top: 8px;
  padding-top: 16px;
}

.price-label {
  font-size: 14px;
  color: #484848;
}

.price-value {
  font-size: 14px;
  font-weight: 500;
  color: #222222;
}

.price-offered {
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
}

.price-line--total .price-label,
.price-line--total .price-value {
  font-size: 16px;
  font-weight: 700;
  color: #222222;
}

/* Avertissement prix */
.price-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 12px;
  margin-bottom: 16px;
}

.price-warning-text {
  flex: 1;
}

.price-warning-text strong {
  display: block;
  font-size: 14px;
  color: #92400e;
  margin-bottom: 4px;
}

.price-warning-text p {
  font-size: 13px;
  color: #78350f;
  margin: 0;
}

.price-warning-btn {
  padding: 8px 16px;
  background-color: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s;
}

.price-warning-btn:hover:not(:disabled) {
  background-color: #d97706;
}

.price-warning-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Detail tarifaire */
.price-breakdown {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.breakdown-title {
  font-size: 13px;
  font-weight: 600;
  color: #0369a1;
  margin: 0 0 8px;
}

.breakdown-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #0c4a6e;
  padding: 4px 0;
}

.breakdown-note {
  font-size: 12px;
  color: #0369a1;
  font-style: italic;
  margin: 6px 0 0;
}

/* Échéances */
.payment-schedule {
  background-color: #fff8e6;
  border-radius: 12px;
  padding: 16px;
}

.schedule-title {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 12px 0;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.schedule-label {
  font-size: 14px;
  color: #78350f;
}

.schedule-value {
  font-size: 14px;
  font-weight: 500;
  color: #78350f;
}

.schedule-item--deposit {
  border-top: 1px solid #fcd34d;
  margin-top: 8px;
  padding-top: 12px;
}

@media (min-width: 1024px) {
  .detail-section {
    margin-bottom: 0;
  }
}
</style>
