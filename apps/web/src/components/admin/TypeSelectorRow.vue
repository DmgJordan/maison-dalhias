<script setup lang="ts">
interface TypeSelectorRowProps {
  title: string;
  description: string;
  detail: string;
  selected?: boolean;
}

withDefaults(defineProps<TypeSelectorRowProps>(), {
  selected: false,
});

defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    class="type-row"
    :class="{ 'type-row--selected': selected }"
    @click="$emit('click')"
  >
    <!-- Icon slot -->
    <div class="type-row__icon">
      <slot name="icon" />
    </div>

    <!-- Text column -->
    <div class="type-row__content">
      <div class="type-row__title">{{ title }}</div>
      <div class="type-row__description">{{ description }}</div>
      <div class="type-row__detail">{{ detail }}</div>
    </div>

    <!-- Chevron right -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="type-row__chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </button>
</template>

<style scoped>
.type-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 72px;
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  background-color: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.type-row:hover {
  border-color: #ff385c;
  background-color: #fff8f9;
}

.type-row:focus-visible {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.15);
}

.type-row--selected {
  border-color: #ff385c;
  background-color: #fff8f9;
}

.type-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  background-color: #f7f7f7;
  border-radius: 12px;
}

.type-row__content {
  flex: 1;
  min-width: 0;
}

.type-row__title {
  font-size: 16px;
  font-weight: 600;
  color: #222222;
}

.type-row__description {
  font-size: 14px;
  color: #484848;
  margin-top: 2px;
}

.type-row__detail {
  font-size: 13px;
  color: #717171;
  margin-top: 4px;
}

.type-row__chevron {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #a3a3a3;
  transition: color 0.2s;
}

.type-row:hover .type-row__chevron,
.type-row--selected .type-row__chevron {
  color: #ff385c;
}
</style>
