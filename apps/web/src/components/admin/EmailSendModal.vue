<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import {
  emailApi,
  type Booking,
  type EmailLog,
  type SendDocumentEmailRequest,
} from '../../lib/api';

interface Props {
  booking: Booking;
  initialDocumentTypes: ('contract' | 'invoice')[];
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  sent: [emailLog: EmailLog];
}>();

// State
const selectedDocTypes = ref<('contract' | 'invoice')[]>([]);
const recipientType = ref<'primary' | 'secondary' | 'custom'>('primary');
const customEmail = ref('');
const personalMessage = ref('');
const sending = ref(false);
const errorMessage = ref('');

// Reset state when modal opens
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      selectedDocTypes.value = [...props.initialDocumentTypes];
      recipientType.value = props.booking.primaryClient?.email ? 'primary' : 'custom';
      customEmail.value = '';
      personalMessage.value = '';
      sending.value = false;
      errorMessage.value = '';
    }
  }
);

// Computed
const primaryClient = computed(() => props.booking.primaryClient);
const secondaryClient = computed(() => props.booking.secondaryClient);

const recipientEmail = computed((): string => {
  if (recipientType.value === 'primary') return primaryClient.value?.email ?? '';
  if (recipientType.value === 'secondary') return secondaryClient.value?.email ?? '';
  return customEmail.value;
});

const recipientName = computed((): string => {
  if (recipientType.value === 'primary' && primaryClient.value) {
    return `${primaryClient.value.firstName} ${primaryClient.value.lastName}`;
  }
  if (recipientType.value === 'secondary' && secondaryClient.value) {
    return `${secondaryClient.value.firstName} ${secondaryClient.value.lastName}`;
  }
  return customEmail.value;
});

const subject = computed((): string => {
  if (selectedDocTypes.value.length === 2) return 'Vos documents de réservation';
  if (selectedDocTypes.value.includes('contract')) return 'Votre contrat de location';
  return 'Votre facture';
});

const isValidEmail = computed((): boolean => {
  if (recipientType.value !== 'custom') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail.value);
});

const canSend = computed((): boolean => {
  return (
    selectedDocTypes.value.length > 0 &&
    recipientEmail.value.trim() !== '' &&
    isValidEmail.value &&
    !sending.value
  );
});

const bookingDatesSummary = computed((): string => {
  const start = new Date(props.booking.startDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const end = new Date(props.booking.endDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${start} - ${end}`;
});

const clientNameSummary = computed((): string => {
  if (primaryClient.value) {
    return `${primaryClient.value.firstName} ${primaryClient.value.lastName}`;
  }
  return 'Client non renseigné';
});

// Methods
function toggleDocType(type: 'contract' | 'invoice'): void {
  const idx = selectedDocTypes.value.indexOf(type);
  if (idx >= 0) {
    selectedDocTypes.value.splice(idx, 1);
  } else {
    selectedDocTypes.value.push(type);
  }
}

function clearPersonalMessage(): void {
  personalMessage.value = '';
}

async function handleSend(): Promise<void> {
  if (!canSend.value) return;

  sending.value = true;
  errorMessage.value = '';

  try {
    const request: SendDocumentEmailRequest = {
      bookingId: props.booking.id,
      documentTypes: selectedDocTypes.value,
      recipientEmail: recipientEmail.value,
      recipientName: recipientName.value,
      personalMessage: personalMessage.value || undefined,
    };

    const emailLog = await emailApi.send(request);
    emit('sent', emailLog);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    errorMessage.value =
      err.response?.data?.message ?? "Une erreur est survenue lors de l'envoi de l'email.";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <BaseModal
    v-if="show"
    title="Envoyer par email"
    max-width="560px"
    :submitting="sending"
    @close="emit('close')"
  >
    <!-- Context reminder -->
    <div class="context-banner">
      <strong>{{ clientNameSummary }}</strong>
      <span class="context-dates">{{ bookingDatesSummary }}</span>
    </div>

    <!-- Recipient selector -->
    <div class="form-section">
      <label class="section-label">Destinataire</label>

      <label class="radio-option" :class="{ disabled: !primaryClient?.email }">
        <input
          v-model="recipientType"
          type="radio"
          value="primary"
          :disabled="!primaryClient?.email"
        />
        <span class="radio-text">
          Client principal :
          <strong>{{ primaryClient?.firstName }} {{ primaryClient?.lastName }}</strong>
          <span v-if="primaryClient?.email" class="email-display">({{ primaryClient.email }})</span>
          <span v-else class="no-email">- pas d'email</span>
        </span>
      </label>

      <label
        v-if="secondaryClient"
        class="radio-option"
        :class="{ disabled: !secondaryClient?.email }"
      >
        <input
          v-model="recipientType"
          type="radio"
          value="secondary"
          :disabled="!secondaryClient?.email"
        />
        <span class="radio-text">
          Client secondaire :
          <strong>{{ secondaryClient.firstName }} {{ secondaryClient.lastName }}</strong>
          <span v-if="secondaryClient.email" class="email-display"
            >({{ secondaryClient.email }})</span
          >
          <span v-else class="no-email">- pas d'email</span>
        </span>
      </label>

      <label class="radio-option">
        <input v-model="recipientType" type="radio" value="custom" />
        <span class="radio-text">Autre adresse</span>
      </label>

      <input
        v-if="recipientType === 'custom'"
        id="custom-email-input"
        v-model="customEmail"
        type="email"
        class="custom-email-input"
        :class="{ 'input-error': customEmail && !isValidEmail }"
        placeholder="email@exemple.com"
        aria-label="Adresse email du destinataire"
        :aria-invalid="customEmail && !isValidEmail ? 'true' : undefined"
        aria-describedby="custom-email-error"
      />
      <span
        v-if="recipientType === 'custom' && customEmail && !isValidEmail"
        id="custom-email-error"
        class="email-error"
        role="alert"
      >
        Adresse email invalide
      </span>
    </div>

    <!-- Document selection -->
    <div class="form-section">
      <label class="section-label">Documents à envoyer</label>
      <div class="checkbox-group">
        <label class="checkbox-option">
          <input
            type="checkbox"
            :checked="selectedDocTypes.includes('contract')"
            @change="toggleDocType('contract')"
          />
          <span class="checkbox-text">Contrat de location</span>
        </label>
        <label class="checkbox-option">
          <input
            type="checkbox"
            :checked="selectedDocTypes.includes('invoice')"
            @change="toggleDocType('invoice')"
          />
          <span class="checkbox-text">Facture</span>
        </label>
      </div>
    </div>

    <!-- Subject -->
    <div class="form-section">
      <label class="section-label">Objet</label>
      <div class="subject-preview">[Maison Dalhias] {{ subject }}</div>
    </div>

    <!-- Professional message preview -->
    <div class="form-section">
      <label class="section-label">Message professionnel</label>
      <div class="message-preview">
        Bonjour {{ recipientName }},<br />
        Veuillez trouver ci-joint les documents pour votre réservation. Nous vous souhaitons un
        agréable séjour.
      </div>
    </div>

    <!-- Personal message -->
    <div class="form-section">
      <div class="personal-message-header">
        <label class="section-label">Ajouter un mot personnel (optionnel)</label>
        <button
          v-if="personalMessage"
          class="clear-message-btn"
          type="button"
          @click="clearPersonalMessage"
        >
          Effacer le message
        </button>
      </div>
      <textarea
        v-model="personalMessage"
        class="personal-message-input"
        placeholder="Écrivez un message personnel qui sera ajouté à l'email..."
        rows="3"
      ></textarea>
    </div>

    <!-- Attachments preview -->
    <div class="form-section">
      <label class="section-label">Pièces jointes</label>
      <div class="attachments-list">
        <div v-if="selectedDocTypes.includes('contract')" class="attachment-item">
          <svg
            class="attachment-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>contrat_location.pdf</span>
        </div>
        <div v-if="selectedDocTypes.includes('invoice')" class="attachment-item">
          <svg
            class="attachment-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>facture.pdf</span>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="error-banner" role="alert">
      <strong>Erreur :</strong> {{ errorMessage }}
    </div>

    <template #actions>
      <button type="button" class="btn-cancel" :disabled="sending" @click="emit('close')">
        Annuler
      </button>
      <button type="button" class="btn-send" :disabled="!canSend" @click="handleSend">
        <template v-if="sending">
          <span class="spinner"></span>
          Envoi en cours...
        </template>
        <template v-else> Envoyer </template>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.context-banner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 15px;
}

.context-dates {
  color: #6b7280;
  font-size: 14px;
}

.form-section {
  margin-bottom: 18px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.15s;
}

.radio-option:hover:not(.disabled) {
  background: #f9fafb;
}

.radio-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.radio-option input[type='radio'] {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  accent-color: #ff385c;
}

.radio-text {
  flex: 1;
  line-height: 1.4;
}

.email-display {
  color: #6b7280;
  font-size: 13px;
}

.no-email {
  color: #ef4444;
  font-size: 13px;
  font-style: italic;
}

.custom-email-input {
  display: block;
  width: 100%;
  padding: 10px 14px;
  margin-top: 8px;
  margin-left: 28px;
  max-width: calc(100% - 28px);
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s;
}

.custom-email-input:focus {
  border-color: #ff385c;
}

.custom-email-input.input-error {
  border-color: #ef4444;
}

.email-error {
  display: block;
  margin-top: 4px;
  margin-left: 28px;
  font-size: 13px;
  color: #ef4444;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.15s;
}

.checkbox-option:hover {
  background: #f9fafb;
}

.checkbox-option input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #ff385c;
}

.subject-preview {
  padding: 10px 14px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
}

.message-preview {
  padding: 12px 14px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.personal-message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.personal-message-header .section-label {
  margin-bottom: 0;
}

.clear-message-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s;
}

.clear-message-btn:hover {
  background: #fef2f2;
}

.personal-message-input {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}

.personal-message-input:focus {
  border-color: #ff385c;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
}

.attachment-icon {
  width: 18px;
  height: 18px;
  color: #ef4444;
  flex-shrink: 0;
}

.error-banner {
  padding: 14px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 15px;
  line-height: 1.4;
  margin-top: 12px;
}

.btn-cancel {
  padding: 12px 24px;
  min-height: 48px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-send {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  min-height: 48px;
  border: none;
  border-radius: 8px;
  background: #ff385c;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-send:hover:not(:disabled) {
  background: #e0314f;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
