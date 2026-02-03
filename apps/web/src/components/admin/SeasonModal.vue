<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Season } from '../../lib/api';
import BaseModal from './BaseModal.vue';

interface Props {
  season?: Season | null;
  submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  season: null,
  submitting: false,
});

const emit = defineEmits<{
  close: [];
  save: [data: { name: string; pricePerNight: number }];
}>();

const name = ref('');
const pricePerNight = ref<number | string>('');

const isEditing = computed((): boolean => !!props.season);

const modalTitle = computed((): string => {
  return isEditing.value ? 'Modifier la saison' : 'Nouvelle saison';
});

const isValid = computed((): boolean => {
  const trimmedName = name.value.trim();
  const numPrice =
    typeof pricePerNight.value === 'string' ? parseFloat(pricePerNight.value) : pricePerNight.value;

  return trimmedName.length > 0 && !isNaN(numPrice) && numPrice > 0;
});

const handleSubmit = (): void => {
  if (!isValid.value || props.submitting) return;

  const numPrice =
    typeof pricePerNight.value === 'string' ? parseFloat(pricePerNight.value) : pricePerNight.value;

  emit('save', {
    name: name.value.trim(),
    pricePerNight: numPrice,
  });
};

const handleClose = (): void => {
  if (!props.submitting) {
    emit('close');
  }
};

// Synchroniser les refs quand la prop season change
watch(
  () => props.season,
  (newSeason) => {
    if (newSeason) {
      name.value = newSeason.name;
      pricePerNight.value = newSeason.pricePerNight;
    } else {
      name.value = '';
      pricePerNight.value = '';
    }
  },
  { immediate: true }
);
</script>

<template>
  <BaseModal :title="modalTitle" :submitting="submitting" max-width="400px" @close="handleClose">
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="season-name" class="form-label">Nom de la saison</label>
        <input
          id="season-name"
          v-model="name"
          type="text"
          class="form-input"
          placeholder="Ex: Haute saison"
          :disabled="submitting"
          autofocus
        />
      </div>

      <div class="form-group">
        <label for="season-price" class="form-label">Prix par nuit</label>
        <div class="price-input">
          <input
            id="season-price"
            v-model="pricePerNight"
            type="number"
            class="form-input"
            placeholder="0"
            min="1"
            step="1"
            :disabled="submitting"
          />
          <span class="price-suffix">EUR / nuit</span>
        </div>
      </div>
    </form>

    <template #actions>
      <button type="button" class="btn btn-secondary" :disabled="submitting" @click="handleClose">
        Annuler
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="!isValid || submitting"
        @click="handleSubmit"
      >
        <span v-if="submitting" class="spinner"></span>
        {{ isEditing ? 'Enregistrer' : 'Créer' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-group {
  margin-bottom: 20px;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  color: #111827;
  transition: all 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.1);
}

.form-input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: #9ca3af;
}

.price-input {
  position: relative;
}

.price-input .form-input {
  padding-right: 90px;
}

.price-suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #6b7280;
  pointer-events: none;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.btn-primary {
  background: #ff385c;
  color: white;
  min-width: 100px;
}

.btn-primary:hover:not(:disabled) {
  background: #e31c5f;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
