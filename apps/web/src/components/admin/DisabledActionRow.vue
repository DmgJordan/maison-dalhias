<script setup lang="ts">
interface DisabledActionRowProps {
  icon: string;
  label: string;
  reason: string | null;
  enabled: boolean;
  loading?: boolean;
}

defineProps<DisabledActionRowProps>();
const emit = defineEmits<{ click: [] }>();

function handleClick(enabled: boolean, loading?: boolean): void {
  if (enabled && !loading) {
    emit('click');
  }
}
</script>

<template>
  <button
    :class="['action-row', enabled && !loading ? 'action-row--enabled' : 'action-row--disabled']"
    :disabled="!enabled || loading"
    @click="handleClick(enabled, loading)"
  >
    <div class="action-row__left">
      <div
        :class="[
          'action-row__icon-wrap',
          enabled ? 'action-row__icon-wrap--enabled' : 'action-row__icon-wrap--disabled',
        ]"
      >
        <div v-if="loading" class="action-row__spinner"></div>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="action-row__svg"
          v-html="icon"
        />
      </div>
      <div class="action-row__text">
        <span
          :class="[
            'action-row__label',
            enabled ? 'action-row__label--enabled' : 'action-row__label--disabled',
          ]"
        >
          {{ loading ? 'Génération...' : label }}
        </span>
        <span v-if="!enabled && reason" class="action-row__reason">
          {{ reason }}
        </span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.action-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  cursor: default;
  transition: all 0.2s ease;
  min-height: 48px;
  font-family: inherit;
  text-align: left;
}

.action-row--enabled {
  background: #fff;
  border: 2px solid #e5e5e5;
  cursor: pointer;
}

.action-row--enabled:hover {
  border-color: #ff385c;
  background: #fff;
}

.action-row--disabled {
  background: #f7f7f7;
  border: 2px solid transparent;
}

.action-row__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-row__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.action-row__icon-wrap--enabled {
  background: rgba(255, 56, 92, 0.1);
  color: #ff385c;
}

.action-row__icon-wrap--disabled {
  background: #f3f4f6;
  color: #9ca3af;
}

.action-row__svg {
  width: 20px;
  height: 20px;
}

.action-row__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.action-row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-row__label--enabled {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.action-row__label--disabled {
  font-size: 15px;
  font-weight: 500;
  color: #9ca3af;
}

.action-row__reason {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.3;
}
</style>
