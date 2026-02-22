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
    class="group flex min-h-[72px] w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    :class="
      selected
        ? 'border-primary bg-rose-50/30 ring-2 ring-primary/20'
        : 'border-gray-200 hover:border-primary hover:bg-rose-50/20'
    "
    @click="$emit('click')"
  >
    <!-- Icon slot -->
    <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
      <slot name="icon" />
    </div>

    <!-- Text column -->
    <div class="min-w-0 flex-1">
      <div class="text-lg font-semibold text-dark">{{ title }}</div>
      <div class="text-sm text-text">{{ description }}</div>
      <div class="mt-1 text-xs text-gray-400">{{ detail }}</div>
    </div>

    <!-- Chevron right -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5 flex-shrink-0 text-gray-400 transition-colors"
      :class="selected ? 'text-primary' : 'group-hover:text-primary'"
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
