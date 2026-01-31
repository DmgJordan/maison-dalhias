<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authApi } from '../../lib/api';

const router = useRouter();
const route = useRoute();
const isLoggingOut = ref(false);

interface Tab {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const tabs: Tab[] = [
  { id: 'bookings', label: 'Réservations', icon: 'calendar', route: '/admin/reservations' },
  { id: 'messages', label: 'Messages', icon: 'mail', route: '/admin/messages' },
  { id: 'new', label: 'Nouveau', icon: 'plus', route: '/admin/nouveau' },
];

const activeTab = computed((): string => {
  const path = route.path;
  if (path.includes('/messages')) return 'messages';
  if (path.includes('/nouveau')) return 'new';
  return 'bookings';
});

const pageTitle = computed((): string => {
  switch (activeTab.value) {
    case 'messages':
      return 'Messages';
    case 'new':
      return 'Nouvelle réservation';
    default:
      return 'Réservations';
  }
});

const navigateTo = (tab: Tab): void => {
  router.push(tab.route);
};

const goToHome = (): void => {
  window.location.href = '/';
};

const signOut = async (): Promise<void> => {
  try {
    isLoggingOut.value = true;
    await authApi.logout();
    router.push('/login');
  } catch (err) {
    console.error('Erreur lors de la déconnexion:', err);
  } finally {
    isLoggingOut.value = false;
  }
};
</script>

<template>
  <div class="admin-layout">
    <!-- Header mobile -->
    <header class="admin-header">
      <div class="header-content">
        <h1 class="header-title">{{ pageTitle }}</h1>
        <div class="header-actions">
          <button class="header-btn" title="Retour au site" @click="goToHome">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span class="btn-label">Site</span>
          </button>
          <button
            class="header-btn header-btn--logout"
            title="Déconnexion"
            :disabled="isLoggingOut"
            @click="signOut"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span class="btn-label">{{ isLoggingOut ? '...' : 'Sortir' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Sidebar desktop -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">Maison Dalhias</h2>
        <p class="sidebar-subtitle">Administration</p>
      </div>
      <nav class="sidebar-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="sidebar-tab"
          :class="{ 'sidebar-tab--active': activeTab === tab.id }"
          @click="navigateTo(tab)"
        >
          <!-- Calendar icon -->
          <svg
            v-if="tab.icon === 'calendar'"
            xmlns="http://www.w3.org/2000/svg"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <!-- Mail icon -->
          <svg
            v-else-if="tab.icon === 'mail'"
            xmlns="http://www.w3.org/2000/svg"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <!-- Plus icon -->
          <svg
            v-else-if="tab.icon === 'plus'"
            xmlns="http://www.w3.org/2000/svg"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <button class="sidebar-btn" @click="goToHome">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Retour au site</span>
        </button>
        <button class="sidebar-btn sidebar-btn--logout" :disabled="isLoggingOut" @click="signOut">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{{ isLoggingOut ? 'Déconnexion...' : 'Déconnexion' }}</span>
        </button>
      </div>
    </aside>

    <!-- Contenu principal -->
    <main class="admin-content">
      <router-view />
    </main>

    <!-- Navigation bottom mobile -->
    <nav class="bottom-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="bottom-tab"
        :class="{ 'bottom-tab--active': activeTab === tab.id }"
        @click="navigateTo(tab)"
      >
        <!-- Calendar icon -->
        <svg
          v-if="tab.icon === 'calendar'"
          xmlns="http://www.w3.org/2000/svg"
          class="tab-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <!-- Mail icon -->
        <svg
          v-else-if="tab.icon === 'mail'"
          xmlns="http://www.w3.org/2000/svg"
          class="tab-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <!-- Plus icon -->
        <svg
          v-else-if="tab.icon === 'plus'"
          xmlns="http://www.w3.org/2000/svg"
          class="tab-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* Layout principal */
.admin-layout {
  min-height: 100vh;
  background-color: #f7f7f7;
  display: flex;
  flex-direction: column;
}

/* Header mobile */
.admin-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background-color: white;
  border-bottom: 1px solid #e5e5e5;
  padding: 0 16px;
  height: 64px;
}

.header-content {
  max-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  background-color: #f7f7f7;
  color: #484848;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.header-btn:hover {
  background-color: #e8e8e8;
}

.header-btn--logout {
  background-color: #ff385c;
  color: white;
}

.header-btn--logout:hover {
  background-color: #e31c5f;
}

.header-btn--logout:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.header-btn .icon {
  width: 20px;
  height: 20px;
}

.btn-label {
  display: none;
}

@media (min-width: 400px) {
  .btn-label {
    display: inline;
  }
}

/* Sidebar desktop - cachée sur mobile */
.admin-sidebar {
  display: none;
}

/* Contenu principal */
.admin-content {
  flex: 1;
  padding: 80px 16px 100px;
  max-width: 100%;
  overflow-x: hidden;
}

/* Navigation bottom mobile */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background-color: white;
  border-top: 1px solid #e5e5e5;
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

.bottom-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  min-height: 56px;
}

.bottom-tab .tab-icon {
  width: 24px;
  height: 24px;
  color: #717171;
  transition: color 0.2s;
}

.bottom-tab .tab-label {
  font-size: 12px;
  font-weight: 500;
  color: #717171;
  transition: color 0.2s;
}

.bottom-tab--active {
  background-color: #fff0f3;
}

.bottom-tab--active .tab-icon {
  color: #ff385c;
}

.bottom-tab--active .tab-label {
  color: #ff385c;
  font-weight: 600;
}

.bottom-tab:not(.bottom-tab--active):hover {
  background-color: #f7f7f7;
}

/* Tablette et desktop - sidebar */
@media (min-width: 768px) {
  .admin-layout {
    flex-direction: row;
  }

  .admin-header {
    display: none;
  }

  .admin-sidebar {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 240px;
    background-color: white;
    border-right: 1px solid #e5e5e5;
    z-index: 40;
  }

  .sidebar-header {
    padding: 24px 20px;
    border-bottom: 1px solid #e5e5e5;
  }

  .sidebar-title {
    font-size: 18px;
    font-weight: 700;
    color: #ff385c;
    margin: 0 0 4px 0;
  }

  .sidebar-subtitle {
    font-size: 14px;
    color: #717171;
    margin: 0;
  }

  .sidebar-nav {
    flex: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-tab {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
  }

  .sidebar-tab .tab-icon {
    width: 22px;
    height: 22px;
    color: #717171;
    flex-shrink: 0;
  }

  .sidebar-tab .tab-label {
    font-size: 15px;
    font-weight: 500;
    color: #484848;
  }

  .sidebar-tab--active {
    background-color: #fff0f3;
  }

  .sidebar-tab--active .tab-icon {
    color: #ff385c;
  }

  .sidebar-tab--active .tab-label {
    color: #ff385c;
    font-weight: 600;
  }

  .sidebar-tab:not(.sidebar-tab--active):hover {
    background-color: #f7f7f7;
  }

  .sidebar-footer {
    padding: 16px 12px;
    border-top: 1px solid #e5e5e5;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
    font-size: 14px;
    color: #717171;
  }

  .sidebar-btn .tab-icon {
    width: 20px;
    height: 20px;
  }

  .sidebar-btn:hover {
    background-color: #f7f7f7;
    color: #484848;
  }

  .sidebar-btn--logout:hover {
    background-color: #fff0f3;
    color: #ff385c;
  }

  .sidebar-btn--logout:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .admin-content {
    margin-left: 240px;
    padding: 32px;
    max-width: calc(100% - 240px);
  }

  .bottom-nav {
    display: none;
  }
}

/* Grand écran */
@media (min-width: 1024px) {
  .admin-content {
    padding: 40px 48px;
  }
}
</style>
