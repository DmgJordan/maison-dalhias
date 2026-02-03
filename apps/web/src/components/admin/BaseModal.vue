<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

interface Props {
  title: string;
  submitting?: boolean;
  maxWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false,
  maxWidth: '400px',
});

const emit = defineEmits<{
  close: [];
}>();

const handleClose = (): void => {
  if (!props.submitting) {
    emit('close');
  }
};

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') {
    handleClose();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="handleClose">
      <div class="modal" :style="{ maxWidth }" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h2 class="modal-title">{{ title }}</h2>
          <button class="close-btn" :disabled="submitting" aria-label="Fermer" @click="handleClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="modal-body">
          <slot></slot>
        </div>

        <div v-if="$slots.actions" class="modal-actions">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
}

.modal {
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 0 24px 24px;
}

/* Mobile */
@media (max-width: 480px) {
  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>
