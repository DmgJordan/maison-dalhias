<script setup lang="ts">
interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  variant: 'outline' | 'primary';
}

defineProps<ActionCardProps>();
const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <button
    :class="[
      'action-card',
      variant === 'primary' ? 'action-card--primary' : 'action-card--outline',
    ]"
    @click="emit('click')"
  >
    <div
      :class="[
        'action-card__icon',
        variant === 'primary' ? 'action-card__icon--primary' : 'action-card__icon--outline',
      ]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="action-card__svg"
        v-html="icon"
      />
    </div>
    <span class="action-card__title">{{ title }}</span>
    <span class="action-card__description">{{ description }}</span>
  </button>
</template>

<style scoped>
.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 20px;
  border-radius: 16px;
  border-width: 2px;
  border-style: solid;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  min-width: 48px;
  background: none;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.action-card--outline {
  border-color: #e5e5e5;
  background: #fff;
}

.action-card--outline:hover {
  border-color: #ff385c;
}

.action-card--primary {
  border-color: rgba(255, 56, 92, 0.3);
  background: rgba(255, 56, 92, 0.05);
}

.action-card--primary:hover {
  border-color: #ff385c;
}

.action-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.action-card__icon--outline {
  background: #f3f4f6;
  color: #6b7280;
}

.action-card__icon--primary {
  background: rgba(255, 56, 92, 0.1);
  color: #ff385c;
}

.action-card__svg {
  width: 24px;
  height: 24px;
}

.action-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.action-card__description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}
</style>
