<script setup lang="ts">
// Vue placeholder - sera développée dans la Phase 4
</script>

<template>
  <div class="new-booking-view">
    <div class="placeholder">
      <div class="placeholder-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <h2 class="placeholder-title">Nouvelle réservation</h2>
      <p class="placeholder-text">
        Le formulaire de création de réservation manuelle sera disponible prochainement.
      </p>
      <div class="placeholder-features">
        <div class="feature">
          <span class="feature-number">1</span>
          <span class="feature-text">Sélection des dates</span>
        </div>
        <div class="feature">
          <span class="feature-number">2</span>
          <span class="feature-text">Informations client</span>
        </div>
        <div class="feature">
          <span class="feature-number">3</span>
          <span class="feature-text">Options et tarifs</span>
        </div>
        <div class="feature">
          <span class="feature-number">4</span>
          <span class="feature-text">Récapitulatif et validation</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-booking-view {
  max-width: 500px;
  margin: 0 auto;
}

.placeholder {
  background-color: white;
  border-radius: 20px;
  padding: 40px 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.placeholder-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  color: #ff385c;
}

.placeholder-icon svg {
  width: 100%;
  height: 100%;
}

.placeholder-title {
  font-size: 22px;
  font-weight: 700;
  color: #222222;
  margin: 0 0 12px 0;
}

.placeholder-text {
  font-size: 15px;
  color: #717171;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

.placeholder-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.feature {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: #f7f7f7;
  border-radius: 12px;
}

.feature-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #fff0f3;
  color: #ff385c;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.feature-text {
  font-size: 15px;
  color: #484848;
  font-weight: 500;
}
</style>
