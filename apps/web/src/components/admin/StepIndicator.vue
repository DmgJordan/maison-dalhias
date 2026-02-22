<script setup lang="ts">
interface Props {
  currentStep: number;
  totalSteps: number;
  label: string;
}

defineProps<Props>();
</script>

<template>
  <p class="text-sm uppercase tracking-wide text-gray-500">
    Etape {{ currentStep }}/{{ totalSteps }} — {{ label }}
  </p>
</template>
