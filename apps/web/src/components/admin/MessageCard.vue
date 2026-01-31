<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ContactForm } from '../../lib/api';

interface Props {
  message: ContactForm;
  loading?: boolean;
  read?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  read: false,
});

const emit = defineEmits<{
  'mark-read': [id: string];
}>();

const isExpanded = ref(false);

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const truncatedMessage = computed((): string => {
  const maxLength = 100;
  if (props.message.message.length <= maxLength) {
    return props.message.message;
  }
  return props.message.message.substring(0, maxLength) + '...';
});

const handleMarkAsRead = (): void => {
  emit('mark-read', props.message.id);
};

const toggleExpand = (): void => {
  isExpanded.value = !isExpanded.value;
};
</script>

<template>
  <div
    class="message-card"
    :class="{
      'message-card--unread': !read,
      'message-card--expanded': isExpanded,
    }"
  >
    <!-- En-tête cliquable -->
    <button class="card-header" @click="toggleExpand">
      <div class="header-content">
        <div class="sender-info">
          <span class="sender-name">{{ message.name }}</span>
          <span class="message-date">{{ formatDateTime(message.createdAt) }}</span>
        </div>
        <h3 class="message-subject">{{ message.subject }}</h3>
        <p v-if="!isExpanded" class="message-preview">{{ truncatedMessage }}</p>
      </div>
      <div class="expand-icon" :class="{ 'expand-icon--rotated': isExpanded }">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </button>

    <!-- Contenu étendu -->
    <Transition name="expand">
      <div v-if="isExpanded" class="card-body">
        <!-- Contact -->
        <div class="contact-info">
          <a :href="`mailto:${message.email}`" class="contact-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="contact-icon"
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
            {{ message.email }}
          </a>
          <a v-if="message.phone" :href="`tel:${message.phone}`" class="contact-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="contact-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
              />
            </svg>
            {{ message.phone }}
          </a>
        </div>

        <!-- Message complet -->
        <div class="message-full">
          <p>{{ message.message }}</p>
        </div>

        <!-- Action -->
        <div v-if="!read" class="card-action">
          <button class="mark-read-btn" :disabled="loading" @click.stop="handleMarkAsRead">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Marquer comme lu
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.message-card {
  background-color: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
  transition: all 0.2s;
}

.message-card--unread {
  border-left: 4px solid #ff385c;
  background-color: #fffbfc;
}

.message-card--expanded {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* En-tête */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.sender-info {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.sender-name {
  font-size: 15px;
  font-weight: 600;
  color: #222222;
}

.message-date {
  font-size: 13px;
  color: #717171;
}

.message-subject {
  font-size: 16px;
  font-weight: 600;
  color: #484848;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.message-card--unread .message-subject {
  color: #222222;
}

.message-preview {
  font-size: 14px;
  color: #717171;
  margin: 0;
  line-height: 1.4;
}

.expand-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: #717171;
  transition: transform 0.2s;
}

.expand-icon--rotated {
  transform: rotate(180deg);
}

.expand-icon svg {
  width: 100%;
  height: 100%;
}

/* Corps étendu */
.card-body {
  padding: 0 20px 20px;
  border-top: 1px solid #f0f0f0;
}

.contact-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 0;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #484848;
  text-decoration: none;
  padding: 8px 12px;
  background-color: #f7f7f7;
  border-radius: 8px;
  transition: all 0.2s;
}

.contact-item:hover {
  background-color: #e8e8e8;
  color: #222222;
}

.contact-icon {
  width: 16px;
  height: 16px;
  color: #717171;
}

.message-full {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.message-full p {
  font-size: 15px;
  line-height: 1.6;
  color: #484848;
  margin: 0;
  white-space: pre-wrap;
}

/* Action */
.card-action {
  display: flex;
  justify-content: flex-end;
}

.mark-read-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mark-read-btn:hover:not(:disabled) {
  background-color: #059669;
}

.mark-read-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* Transition expand */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}
</style>
