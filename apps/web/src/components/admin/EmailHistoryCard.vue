<script setup lang="ts">
import type { EmailLog } from '../../lib/api';

interface Props {
  emailLog: EmailLog;
}

defineProps<Props>();
const emit = defineEmits<{
  resend: [emailLog: EmailLog];
}>();

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return (
    date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

function getDocLabel(type: string): string {
  if (type === 'contract') return 'Contrat';
  if (type === 'invoice') return 'Facture';
  return type;
}
</script>

<template>
  <div class="email-history-card" :class="{ failed: emailLog.status === 'FAILED' }">
    <div class="card-header">
      <span class="status-badge" :class="emailLog.status === 'SENT' ? 'sent' : 'failed'">
        {{ emailLog.status === 'SENT' ? 'Envoyé' : 'Erreur' }}
      </span>
      <span class="card-date">{{ formatDateTime(emailLog.sentAt) }}</span>
    </div>

    <div class="card-body">
      <div class="recipient-line">
        <strong>{{ emailLog.recipientName }}</strong>
        <span class="recipient-email">({{ emailLog.recipientEmail }})</span>
      </div>

      <div class="doc-tags">
        <span v-for="docType in emailLog.documentTypes" :key="docType" class="doc-tag">
          {{ getDocLabel(docType) }}
        </span>
      </div>

      <div v-if="emailLog.personalMessage" class="personal-message-preview">
        {{ emailLog.personalMessage }}
      </div>

      <div v-if="emailLog.status === 'FAILED' && emailLog.failureReason" class="failure-reason">
        {{ emailLog.failureReason }}
      </div>
    </div>

    <div class="card-actions">
      <button class="resend-btn" @click="emit('resend', emailLog)">Renvoyer</button>
    </div>
  </div>
</template>

<style scoped>
.email-history-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  background: white;
  transition: box-shadow 0.15s;
}

.email-history-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.email-history-card.failed {
  border-color: #fecaca;
  background: #fefefe;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.status-badge.sent {
  background: #dcfce7;
  color: #166534;
}

.status-badge.failed {
  background: #fef2f2;
  color: #dc2626;
}

.card-date {
  font-size: 13px;
  color: #9ca3af;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipient-line {
  font-size: 15px;
  color: #111827;
}

.recipient-email {
  color: #6b7280;
  font-size: 13px;
  margin-left: 4px;
}

.doc-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.doc-tag {
  display: inline-flex;
  padding: 3px 10px;
  background: #f3f4f6;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.personal-message-preview {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.failure-reason {
  font-size: 13px;
  color: #dc2626;
  padding: 8px 10px;
  background: #fef2f2;
  border-radius: 6px;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.resend-btn {
  padding: 8px 16px;
  min-height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.resend-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
</style>
