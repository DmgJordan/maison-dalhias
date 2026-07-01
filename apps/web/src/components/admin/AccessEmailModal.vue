<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import { emailApi, type Booking, type EmailLog, type SendAccessEmailRequest } from '../../lib/api';
import { isValidEmail as checkEmail } from '../../utils/validation';
import {
  DEFAULT_ACCESS_EMAIL_SUBJECT,
  DEFAULT_ACCESS_EMAIL_BODY,
} from '../../constants/accessEmail';

interface Props {
  booking: Booking;
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  sent: [emailLog: EmailLog];
}>();

// State
const recipientType = ref<'primary' | 'secondary' | 'custom'>('primary');
const customEmail = ref('');
const subject = ref(DEFAULT_ACCESS_EMAIL_SUBJECT);
const body = ref(DEFAULT_ACCESS_EMAIL_BODY);
const sending = ref(false);
const errorMessage = ref('');

// Reset state when modal opens
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      recipientType.value = props.booking.primaryClient?.email ? 'primary' : 'custom';
      customEmail.value = '';
      subject.value = DEFAULT_ACCESS_EMAIL_SUBJECT;
      body.value = DEFAULT_ACCESS_EMAIL_BODY;
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

const isValidEmail = computed((): boolean => {
  if (recipientType.value !== 'custom') return true;
  return checkEmail(customEmail.value);
});

const canSend = computed((): boolean => {
  return (
    recipientEmail.value.trim() !== '' &&
    isValidEmail.value &&
    subject.value.trim() !== '' &&
    body.value.trim() !== '' &&
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

async function handleSend(): Promise<void> {
  if (!canSend.value) return;

  sending.value = true;
  errorMessage.value = '';

  try {
    const request: SendAccessEmailRequest = {
      bookingId: props.booking.id,
      recipientEmail: recipientEmail.value,
      recipientName: recipientName.value,
      subject: subject.value,
      body: body.value,
    };

    const emailLog = await emailApi.sendAccess(request);
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
    title="Envoyer les informations d'accès"
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
        id="access-custom-email-input"
        v-model="customEmail"
        type="email"
        class="custom-email-input"
        :class="{ 'input-error': customEmail && !isValidEmail }"
        placeholder="email@exemple.com"
        aria-label="Adresse email du destinataire"
        :aria-invalid="customEmail && !isValidEmail ? 'true' : undefined"
        aria-describedby="access-custom-email-error"
      />
      <span
        v-if="recipientType === 'custom' && customEmail && !isValidEmail"
        id="access-custom-email-error"
        class="email-error"
        role="alert"
      >
        Adresse email invalide
      </span>
    </div>

    <!-- Copy info -->
    <div class="cc-notice">
      Une copie de cet email sera automatiquement envoyée au propriétaire du site.
    </div>

    <!-- Subject (editable) -->
    <div class="form-section">
      <label class="section-label" for="access-subject-input">Objet</label>
      <input
        id="access-subject-input"
        v-model="subject"
        type="text"
        class="subject-input"
        placeholder="Objet de l'email"
      />
    </div>

    <!-- Body (editable) -->
    <div class="form-section">
      <label class="section-label" for="access-body-input">Message</label>
      <textarea
        id="access-body-input"
        v-model="body"
        class="body-input"
        placeholder="Contenu de l'email envoyé au client..."
        rows="16"
      ></textarea>
    </div>

    <!-- Attachment preview -->
    <div class="form-section">
      <label class="section-label">Pièce jointe</label>
      <div class="attachments-list">
        <div class="attachment-item">
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
          <span>plan-acces-rouret.pdf</span>
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

.cc-notice {
  padding: 10px 14px;
  margin-bottom: 18px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 13px;
  color: #1e40af;
}

.subject-input {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.subject-input:focus {
  border-color: #ff385c;
}

.body-input {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}

.body-input:focus {
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
