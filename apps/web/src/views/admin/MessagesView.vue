<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { contactsApi, type ContactForm } from '../../lib/api';
import MessageCard from '../../components/admin/MessageCard.vue';

const messages = ref<ContactForm[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const unreadMessages = computed((): ContactForm[] => {
  return messages.value.filter((m) => m.status === 'sent' || m.status === 'pending');
});

const readMessages = computed((): ContactForm[] => {
  return messages.value.filter((m) => m.status === 'read');
});

const unreadCount = computed((): number => {
  return unreadMessages.value.length;
});

const fetchMessages = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    const data = await contactsApi.getAll();
    messages.value = data;
  } catch (err) {
    console.error('Erreur lors du chargement des messages:', err);
    error.value = 'Impossible de charger les messages. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
};

const showSuccess = (message: string): void => {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = null;
  }, 3000);
};

const handleMarkAsRead = async (id: string): Promise<void> => {
  try {
    loading.value = true;
    error.value = null;
    await contactsApi.markAsRead(id);
    await fetchMessages();
    showSuccess('Message marqué comme lu');
  } catch (err) {
    console.error('Erreur lors du marquage comme lu:', err);
    error.value = 'Impossible de marquer le message comme lu. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void fetchMessages();
});
</script>

<template>
  <div class="messages-view">
    <!-- Message de succès -->
    <Transition name="fade">
      <div v-if="successMessage" class="success-toast">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="toast-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- Message d'erreur -->
    <Transition name="fade">
      <div v-if="error" class="error-banner">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="error-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
        <button class="error-close" @click="error = null">Fermer</button>
      </div>
    </Transition>

    <!-- Chargement -->
    <div v-if="loading && messages.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des messages...</p>
    </div>

    <!-- Contenu -->
    <template v-else>
      <!-- Messages non lus -->
      <section v-if="unreadMessages.length > 0" class="messages-section">
        <h2 class="section-title section-title--unread">
          <span class="unread-badge">{{ unreadCount }}</span>
          Non lu{{ unreadCount > 1 ? 's' : '' }}
        </h2>
        <div class="messages-list">
          <MessageCard
            v-for="message in unreadMessages"
            :key="message.id"
            :message="message"
            :loading="loading"
            @mark-read="handleMarkAsRead"
          />
        </div>
      </section>

      <!-- Messages lus -->
      <section v-if="readMessages.length > 0" class="messages-section">
        <h2 class="section-title">Lus</h2>
        <div class="messages-list">
          <MessageCard
            v-for="message in readMessages"
            :key="message.id"
            :message="message"
            :loading="loading"
            :read="true"
          />
        </div>
      </section>

      <!-- Aucun message -->
      <div v-if="messages.length === 0" class="empty-state">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <p class="empty-title">Aucun message</p>
        <p class="empty-subtitle">Les messages de contact apparaîtront ici</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.messages-view {
  max-width: 600px;
  margin: 0 auto;
}

/* Toast de succès */
.success-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background-color: #10b981;
  color: white;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.toast-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

/* Bannière d'erreur */
.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  margin-bottom: 20px;
}

.error-icon {
  width: 24px;
  height: 24px;
  color: #ef4444;
  flex-shrink: 0;
}

.error-banner span {
  flex: 1;
  font-size: 15px;
  color: #dc2626;
}

.error-close {
  padding: 8px 14px;
  background-color: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.error-close:hover {
  background-color: #fecaca;
}

/* Sections */
.messages-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #717171;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e5e5;
}

.section-title--unread {
  color: #ff385c;
}

.unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background-color: #ff385c;
  color: white;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* États */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e5e5;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin-top: 16px;
  font-size: 16px;
  color: #717171;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #d4d4d4;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #484848;
  margin: 0 0 8px 0;
}

.empty-subtitle {
  font-size: 15px;
  color: #717171;
  margin: 0;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Desktop: Tablet */
@media (min-width: 768px) {
  .messages-view {
    max-width: 100%;
  }

  .success-toast {
    top: 32px;
  }

  /* Titres de sections améliorés */
  .section-title {
    font-size: 18px;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }

  .unread-badge {
    min-width: 28px;
    height: 28px;
    font-size: 14px;
  }

  /* Grille 2 colonnes */
  .messages-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* Desktop: Large */
@media (min-width: 1200px) {
  .messages-list {
    gap: 20px;
  }
}
</style>
