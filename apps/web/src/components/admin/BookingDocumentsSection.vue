<script setup lang="ts">
import { type Booking, type EmailLog } from '../../lib/api';
import DisabledActionRow from './DisabledActionRow.vue';
import EmailHistoryCard from './EmailHistoryCard.vue';

defineProps<{
  booking: Booking;
  canGenerateContract: boolean;
  canGenerateInvoice: boolean;
  canSendEmail: boolean;
  contractDisabledReason: string | null;
  invoiceDisabledReason: string | null;
  contractEmailReason: string | null;
  invoiceEmailReason: string | null;
  generatingContract: boolean;
  generatingInvoice: boolean;
  modifiedSinceLastSend: boolean;
  showSuccessScreen: boolean;
  lastSentEmail: EmailLog | null;
  emailLogs: EmailLog[];
  visibleEmailLogs: EmailLog[];
  showAllEmails: boolean;
}>();

const emit = defineEmits<{
  'generate-contract': [];
  'generate-invoice': [];
  'send-contract-email': [];
  'send-invoice-email': [];
  'send-both-email': [];
  'dismiss-success': [];
  'toggle-show-all-emails': [];
  'resend-email': [emailLog: EmailLog];
}>();
</script>

<template>
  <!-- Section Documents PDF (hidden when CANCELLED — FR28) -->
  <section v-if="booking.status !== 'CANCELLED'" class="detail-section">
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
        <polyline points="10 9 9 9 8 9" />
      </svg>
      Documents
    </h2>

    <!-- Modified since last send alert -->
    <div v-if="modifiedSinceLastSend" class="modified-alert" role="alert">
      La réservation a été modifiée depuis le dernier envoi. Pensez à renvoyer les documents.
    </div>

    <!-- Success screen -->
    <div v-if="showSuccessScreen && lastSentEmail" class="success-screen">
      <div class="success-icon-large">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h3 class="success-heading">Email envoyé avec succès !</h3>
      <div class="success-recap">
        <p>
          <strong>Destinataire :</strong> {{ lastSentEmail.recipientName }} ({{
            lastSentEmail.recipientEmail
          }})
        </p>
        <p>
          <strong>Documents :</strong>
          {{
            lastSentEmail.documentTypes
              .map((t) => (t === 'contract' ? 'Contrat' : 'Facture'))
              .join(', ')
          }}
        </p>
        <p>
          <strong>Envoyé le :</strong>
          {{
            new Date(lastSentEmail.sentAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          }}
        </p>
      </div>
      <button class="btn-back-to-booking" @click="emit('dismiss-success')">
        Retour à la réservation
      </button>
    </div>

    <!-- Document action rows (hidden during success screen) -->
    <template v-if="!showSuccessScreen">
      <!-- Téléchargement PDF -->
      <div class="doc-group">
        <h3 class="doc-group__title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="doc-group__icon doc-group__icon--download"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Télécharger
        </h3>
        <div class="doc-group__rows">
          <DisabledActionRow
            :icon="'<path d=&quot;M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z&quot; /><polyline points=&quot;14 2 14 8 20 8&quot; /><line x1=&quot;16&quot; y1=&quot;13&quot; x2=&quot;8&quot; y2=&quot;13&quot; /><line x1=&quot;16&quot; y1=&quot;17&quot; x2=&quot;8&quot; y2=&quot;17&quot; />'"
            label="Contrat de location"
            :reason="contractDisabledReason"
            :enabled="canGenerateContract"
            :loading="generatingContract"
            variant="download"
            @click="emit('generate-contract')"
          />
          <DisabledActionRow
            :icon="'<path d=&quot;M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z&quot; /><polyline points=&quot;14 2 14 8 20 8&quot; /><line x1=&quot;16&quot; y1=&quot;13&quot; x2=&quot;8&quot; y2=&quot;13&quot; /><line x1=&quot;16&quot; y1=&quot;17&quot; x2=&quot;8&quot; y2=&quot;17&quot; />'"
            label="Facture"
            :reason="invoiceDisabledReason"
            :enabled="canGenerateInvoice"
            :loading="generatingInvoice"
            variant="download"
            @click="emit('generate-invoice')"
          />
        </div>
      </div>

      <!-- Envoi par email -->
      <div class="doc-group">
        <h3 class="doc-group__title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="doc-group__icon doc-group__icon--email"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Envoyer par email
        </h3>
        <div class="doc-group__rows">
          <DisabledActionRow
            :icon="'<path d=&quot;M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z&quot; /><polyline points=&quot;22,6 12,13 2,6&quot; />'"
            label="Contrat"
            :reason="contractEmailReason"
            :enabled="canSendEmail && canGenerateContract"
            variant="email"
            @click="emit('send-contract-email')"
          />
          <DisabledActionRow
            :icon="'<path d=&quot;M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z&quot; /><polyline points=&quot;22,6 12,13 2,6&quot; />'"
            label="Facture"
            :reason="invoiceEmailReason"
            :enabled="canSendEmail && canGenerateInvoice"
            variant="email"
            @click="emit('send-invoice-email')"
          />
          <DisabledActionRow
            :icon="'<path d=&quot;M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z&quot; /><polyline points=&quot;22,6 12,13 2,6&quot; />'"
            label="Contrat + Facture"
            :reason="invoiceEmailReason"
            :enabled="canSendEmail && canGenerateInvoice"
            variant="email"
            @click="emit('send-both-email')"
          />
        </div>
      </div>
    </template>
  </section>

  <!-- Email History Section (hidden when CANCELLED) -->
  <section v-if="emailLogs.length > 0 && booking.status !== 'CANCELLED'" class="detail-section">
    <h2 class="section-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="section-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      Historique des emails
    </h2>
    <div class="email-history-list">
      <EmailHistoryCard
        v-for="log in visibleEmailLogs"
        :key="log.id"
        :email-log="log"
        @resend="(emailLog) => emit('resend-email', emailLog)"
      />
    </div>
    <button
      v-if="!showAllEmails && emailLogs.length > 2"
      class="show-all-emails-btn"
      @click="emit('toggle-show-all-emails')"
    >
      Voir tout l'historique ({{ emailLogs.length }})
    </button>
  </section>
</template>

<style scoped>
/* Layout (shared pattern — duplicated for scoped isolation) */
.detail-section {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebebeb;
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

/* Document groups */
.doc-group {
  margin-bottom: 20px;
}

.doc-group:last-child {
  margin-bottom: 0;
}

.doc-group__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
  margin: 0 0 10px 4px;
}

.doc-group__icon {
  width: 15px;
  height: 15px;
}

.doc-group__icon--download {
  color: #ff385c;
}

.doc-group__icon--email {
  color: #3b82f6;
}

.doc-group__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Modified alert */
.modified-alert {
  padding: 12px 16px;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  color: #92400e;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
}

/* Success screen */
.success-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 20px;
}

.success-icon-large {
  width: 64px;
  height: 64px;
  color: #10b981;
  margin-bottom: 16px;
}

.success-icon-large svg {
  width: 100%;
  height: 100%;
}

.success-heading {
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
  margin: 0 0 20px 0;
}

.success-recap {
  text-align: left;
  width: 100%;
  max-width: 380px;
  background: #f0fdf4;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.success-recap p {
  margin: 6px 0;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.btn-back-to-booking {
  padding: 14px 28px;
  min-height: 48px;
  border: none;
  border-radius: 10px;
  background: #10b981;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-back-to-booking:hover {
  background: #059669;
}

/* Email history */
.email-history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.show-all-emails-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 16px;
  margin-top: 12px;
  background: white;
  border: 1px solid #ebebeb;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #717171;
  cursor: pointer;
  transition: all 0.15s;
}

.show-all-emails-btn:hover {
  background-color: #f7f7f7;
  border-color: #d4d4d4;
  color: #484848;
}

@media (min-width: 1024px) {
  .detail-section {
    margin-bottom: 0;
  }

  .email-history-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .email-history-list::-webkit-scrollbar {
    width: 6px;
  }

  .email-history-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .email-history-list::-webkit-scrollbar-thumb {
    background-color: #d4d4d4;
    border-radius: 3px;
  }

  .email-history-list::-webkit-scrollbar-thumb:hover {
    background-color: #a3a3a3;
  }

  .show-all-emails-btn {
    display: none;
  }
}
</style>
