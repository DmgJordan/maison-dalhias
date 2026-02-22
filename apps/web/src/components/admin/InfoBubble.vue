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
  <div
    v-if="visible"
    class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700"
  >
    <span class="shrink-0">💡</span>
    <p class="flex-1">{{ message }}</p>
    <button
      type="button"
      class="shrink-0 text-blue-400 hover:text-blue-600"
      aria-label="Fermer"
      @click="dismiss"
    >
      ✕
    </button>
  </div>
</template>
