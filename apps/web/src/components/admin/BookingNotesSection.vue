<script setup lang="ts">
import { ref } from 'vue';
import { bookingsApi, type Booking } from '../../lib/api';
import * as capabilities from '../../utils/bookingCapabilities';

const props = defineProps<{
  booking: Booking;
  hasNotes: boolean;
}>();

const emit = defineEmits<{
  'notes-updated': [booking: Booking];
  'save-error': [message: string];
}>();

const isEditingNotes = ref(false);
const editingNotesText = ref('');
const isSavingNotes = ref(false);

const handleStartEditNotes = (): void => {
  editingNotesText.value = props.booking.notes ?? '';
  isEditingNotes.value = true;
};

const handleCancelEditNotes = (): void => {
  isEditingNotes.value = false;
  editingNotesText.value = '';
};

const handleSaveNotes = async (): Promise<void> => {
  isSavingNotes.value = true;
  try {
    let updatedBooking: Booking;
    if (capabilities.isQuickBooking(props.booking)) {
      updatedBooking = await bookingsApi.updateQuick(props.booking.id, {
        notes: editingNotesText.value,
      });
    } else {
      updatedBooking = await bookingsApi.update(props.booking.id, {
        notes: editingNotesText.value,
      });
    }
    isEditingNotes.value = false;
    emit('notes-updated', updatedBooking);
  } catch (err: unknown) {
    console.error('Erreur lors de la sauvegarde des notes:', err);
    emit('save-error', 'Impossible de sauvegarder les notes. Veuillez réessayer.');
  } finally {
    isSavingNotes.value = false;
  }
};
</script>

<template>
  <section class="detail-section">
    <h2 class="section-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="section-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      Notes
      <button
        v-if="!isEditingNotes && hasNotes"
        class="notes-edit-btn"
        @click="handleStartEditNotes"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="notes-edit-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </h2>

    <!-- Display mode -->
    <template v-if="!isEditingNotes">
      <div v-if="hasNotes" class="notes-card">
        <p class="notes-text">{{ booking.notes }}</p>
      </div>
      <div v-else class="notes-empty">
        <span class="notes-placeholder">Aucune note</span>
        <button class="notes-add-btn" @click="handleStartEditNotes">Ajouter</button>
      </div>
    </template>

    <!-- Edit mode -->
    <template v-else>
      <div class="notes-edit-area">
        <textarea
          v-model="editingNotesText"
          class="notes-textarea"
          rows="4"
          placeholder="Ajouter des notes..."
          :disabled="isSavingNotes"
        ></textarea>
        <div class="notes-edit-actions">
          <button
            class="notes-btn notes-btn--cancel"
            :disabled="isSavingNotes"
            @click="handleCancelEditNotes"
          >
            Annuler
          </button>
          <button
            class="notes-btn notes-btn--save"
            :disabled="isSavingNotes"
            @click="handleSaveNotes"
          >
            {{ isSavingNotes ? 'En cours...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* Layout (shared pattern — duplicated for scoped isolation) */
.detail-section {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #222222;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: #ff385c;
}

/* Notes */
.notes-card {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 12px;
}

.notes-text {
  font-size: 15px;
  color: #484848;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

.notes-edit-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  color: #717171;
  cursor: pointer;
  transition: all 0.15s;
}

.notes-edit-btn:hover {
  background-color: #f3f4f6;
  color: #ff385c;
}

.notes-edit-icon {
  width: 16px;
  height: 16px;
}

.notes-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 12px;
}

.notes-placeholder {
  font-size: 14px;
  color: #b0b0b0;
  font-style: italic;
}

.notes-add-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background-color: white;
  color: #484848;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.notes-add-btn:hover {
  background-color: #f7f7f7;
  border-color: #d4d4d4;
}

.notes-edit-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  color: #222222;
  background-color: white;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.6;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.notes-textarea:focus {
  outline: none;
  border-color: #ff385c;
  box-shadow: 0 0 0 2px rgba(255, 56, 92, 0.1);
}

.notes-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notes-edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.notes-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.notes-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notes-btn--cancel {
  border: 1px solid #e0e0e0;
  background-color: white;
  color: #484848;
}

.notes-btn--cancel:hover:not(:disabled) {
  background-color: #f7f7f7;
}

.notes-btn--save {
  border: none;
  background-color: #ff385c;
  color: white;
}

.notes-btn--save:hover:not(:disabled) {
  background-color: #e0314f;
}

@media (min-width: 1024px) {
  .detail-section {
    margin-bottom: 0;
  }
}
</style>
