<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
  message: string;
  dismissKey: string;
}

const props = defineProps<Props>();

const visible = ref(false);

onMounted(() => {
  if (!localStorage.getItem(props.dismissKey)) {
    visible.value = true;
  }
});

function dismiss(): void {
  localStorage.setItem(props.dismissKey, 'true');
  visible.value = false;
}
</script>

<template>
  <div v-if="visible" class="info-bubble">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="info-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <p class="info-text">{{ message }}</p>
    <button type="button" class="info-close" aria-label="Fermer" @click="dismiss">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="close-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.info-bubble {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background-color: #f0f9ff;
  border-radius: 8px;
}

.info-icon {
  width: 18px;
  height: 18px;
  color: #0284c7;
  flex-shrink: 0;
  margin-top: 1px;
}

.info-text {
  flex: 1;
  font-size: 13px;
  color: #0369a1;
  margin: 0;
  line-height: 1.4;
}

.info-close {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.info-close:hover {
  background-color: #e0f2fe;
}

.close-icon {
  width: 14px;
  height: 14px;
  color: #0284c7;
}
</style>
