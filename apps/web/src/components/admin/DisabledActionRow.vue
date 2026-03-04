<script setup lang="ts">
interface DisabledActionRowProps {
  icon: string;
  label: string;
  reason: string | null;
  enabled: boolean;
  loading?: boolean;
  variant?: 'download' | 'email';
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
    :class="[
      'action-row',
      enabled && !loading ? 'action-row--enabled' : 'action-row--disabled',
      variant === 'email' ? 'action-row--email' : 'action-row--download',
    ]"
    :disabled="!enabled || loading"
    @click="handleClick(enabled, loading)"
  >
    <div class="action-row__left">
      <div
        :class="[
          'action-row__icon-wrap',
          enabled
            ? variant === 'email'
              ? 'action-row__icon-wrap--email'
              : 'action-row__icon-wrap--download'
            : 'action-row__icon-wrap--disabled',
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
  transition: all 0.15s ease;
  min-height: 48px;
  font-family: inherit;
  text-align: left;
}

.action-row--enabled {
  background: white;
  border: 1.5px solid #ebebeb;
  cursor: pointer;
}

.action-row--enabled.action-row--download:hover {
  border-color: #ff385c;
  background: #fff8f9;
}

.action-row--enabled.action-row--email:hover {
  border-color: #3b82f6;
  background: #f0f7ff;
}

.action-row--disabled {
  background: #fafafa;
  border: 1.5px solid transparent;
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
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
}

.action-row__icon-wrap--download {
  background: rgba(255, 56, 92, 0.08);
  color: #ff385c;
}

.action-row__icon-wrap--email {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

.action-row__icon-wrap--disabled {
  background: #f3f4f6;
  color: #c4c4c4;
}

.action-row__svg {
  width: 18px;
  height: 18px;
}

.action-row__spinner {
  width: 18px;
  height: 18px;
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
  font-size: 14px;
  font-weight: 600;
  color: #222222;
}

.action-row__label--disabled {
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
}

.action-row__reason {
  font-size: 12px;
  color: #c4c4c4;
  line-height: 1.3;
}
</style>
