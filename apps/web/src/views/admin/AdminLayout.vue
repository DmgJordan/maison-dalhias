<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authApi, contactsApi, bookingsApi, type Booking } from '../../lib/api';
import { generatePromotionalPoster } from '../../services/pdf';

const router = useRouter();
const route = useRoute();
const isLoggingOut = ref(false);
const isGeneratingPoster = ref(false);
const unreadCount = ref(0);
const upcomingBookingsCount = ref(0);
const nextArrival = ref<Booking | null>(null);

interface Tab {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const tabs: Tab[] = [
  { id: 'bookings', label: 'Réservations', icon: 'calendar', route: '/admin/reservations' },
  { id: 'messages', label: 'Messages', icon: 'mail', route: '/admin/messages' },
  { id: 'pricing', label: 'Tarifs', icon: 'tag', route: '/admin/tarifs' },
  { id: 'new', label: 'Nouveau', icon: 'plus', route: '/admin/nouveau' },
];

const fetchUnreadCount = async (): Promise<void> => {
  try {
    const messages = await contactsApi.getAll();
    unreadCount.value = messages.filter(
      (m) => m.status === 'sent' || m.status === 'pending'
    ).length;
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des messages:', error);
  }
};

const fetchBookingsStats = async (): Promise<void> => {
  try {
    const bookings = await bookingsApi.getAll();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filtrer les réservations à venir (confirmées ou en attente)
    const upcoming = bookings.filter((b) => {
      const endDate = new Date(b.endDate);
      return endDate >= now && b.status !== 'CANCELLED';
    });

    upcomingBookingsCount.value = upcoming.length;

    // Trouver la prochaine arrivée
    const futureArrivals = upcoming
      .filter((b) => new Date(b.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    nextArrival.value = futureArrivals.length > 0 ? futureArrivals[0] : null;
  } catch (error: unknown) {
    console.error('Erreur lors du chargement des réservations:', error);
  }
};

const formatNextArrivalDate = computed((): string => {
  if (!nextArrival.value) return '';
  const date = new Date(nextArrival.value.startDate);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
});

onMounted(() => {
  void fetchUnreadCount();
  void fetchBookingsStats();
});

const activeTab = computed((): string => {
  const path = route.path;
  if (path.includes('/messages')) return 'messages';
  if (path.includes('/tarifs')) return 'pricing';
  if (path.includes('/nouveau')) return 'new';
  return 'bookings';
});

const pageTitle = computed((): string => {
  switch (activeTab.value) {
    case 'messages':
      return 'Messages';
    case 'pricing':
      return 'Tarifs';
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

const handleGeneratePoster = async (): Promise<void> => {
  try {
    isGeneratingPoster.value = true;
    await generatePromotionalPoster();
  } catch (error: unknown) {
    console.error("Erreur lors de la génération de l'affiche:", error);
  } finally {
    isGeneratingPoster.value = false;
  }
};

const signOut = async (): Promise<void> => {
  try {
    isLoggingOut.value = true;
    await authApi.logout();
    router.push('/login');
  } catch (error: unknown) {
    console.error('Erreur lors de la déconnexion:', error);
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
          <button
            class="header-btn"
            title="Générer l'affiche PDF"
            :disabled="isGeneratingPoster"
            @click="handleGeneratePoster"
          >
            <span v-if="isGeneratingPoster" class="btn-spinner btn-spinner--dark"></span>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 18 15 15" />
            </svg>
            <span class="btn-label">{{ isGeneratingPoster ? 'Génération...' : 'Affiche' }}</span>
          </button>
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
            <span v-if="isLoggingOut" class="btn-spinner"></span>
            <svg
              v-else
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
            <span class="btn-label">{{ isLoggingOut ? 'Sortie...' : 'Sortir' }}</span>
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

      <!-- Aperçu rapide (visible uniquement sur grands écrans) -->
      <div class="sidebar-stats">
        <h3 class="stats-title">Aperçu rapide</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">{{ upcomingBookingsCount }}</span>
            <span class="stat-text">À venir</span>
          </div>
          <div class="stat-item stat-item--unread">
            <span class="stat-number">{{ unreadCount }}</span>
            <span class="stat-text">Non lus</span>
          </div>
        </div>
        <div v-if="nextArrival" class="next-arrival">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="arrival-icon"
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
          <div class="arrival-info">
            <span class="arrival-label">Prochaine arrivée</span>
            <span class="arrival-date">{{ formatNextArrivalDate }}</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="sidebar-tab"
          :class="{ 'sidebar-tab--active': activeTab === tab.id }"
          @click="navigateTo(tab)"
        >
          <div class="tab-icon-wrapper">
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
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <!-- Tag icon -->
            <svg
              v-else-if="tab.icon === 'tag'"
              xmlns="http://www.w3.org/2000/svg"
              class="tab-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
              />
              <line x1="7" y1="7" x2="7.01" y2="7" />
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
            <span v-if="tab.icon === 'mail' && unreadCount > 0" class="unread-badge">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </div>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <button class="sidebar-btn" :disabled="isGeneratingPoster" @click="handleGeneratePoster">
          <span v-if="isGeneratingPoster" class="sidebar-spinner"></span>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 18 15 15" />
          </svg>
          <span>{{ isGeneratingPoster ? 'Génération...' : "Générer l'affiche" }}</span>
        </button>
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
          <span v-if="isLoggingOut" class="sidebar-spinner"></span>
          <svg
            v-else
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
        <div class="tab-icon-wrapper">
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
          <!-- Tag icon -->
          <svg
            v-else-if="tab.icon === 'tag'"
            xmlns="http://www.w3.org/2000/svg"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
            />
            <line x1="7" y1="7" x2="7.01" y2="7" />
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
          <span v-if="tab.icon === 'mail' && unreadCount > 0" class="unread-badge">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </div>
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
  opacity: 0.7;
  cursor: not-allowed;
}

.header-btn .icon {
  width: 20px;
  height: 20px;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-spinner--dark {
  border-color: rgba(72, 72, 72, 0.3);
  border-top-color: #484848;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

.tab-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-tab .tab-icon {
  width: 24px;
  height: 24px;
  color: #717171;
  transition: color 0.2s;
}

.unread-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: #ff385c;
  color: white;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
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

  .sidebar-tab .tab-icon-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .sidebar-tab .tab-icon {
    width: 22px;
    height: 22px;
    color: #717171;
    flex-shrink: 0;
  }

  .sidebar-tab .unread-badge {
    top: -4px;
    right: -8px;
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
    opacity: 0.7;
    cursor: not-allowed;
  }

  .sidebar-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e5e5e5;
    border-top-color: #ff385c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
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

/* Très grand écran - sidebar élargie */
@media (min-width: 1200px) {
  .admin-sidebar {
    width: 280px;
  }

  .admin-content {
    margin-left: 280px;
    max-width: calc(100% - 280px);
  }

  /* Section Aperçu rapide */
  .sidebar-stats {
    display: block;
    padding: 16px 16px;
    margin: 0 12px;
    background-color: #f9f9f9;
    border-radius: 12px;
    margin-bottom: 8px;
  }

  .stats-title {
    font-size: 12px;
    font-weight: 600;
    color: #717171;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    background-color: white;
    border-radius: 8px;
  }

  .stat-number {
    font-size: 24px;
    font-weight: 700;
    color: #222222;
    line-height: 1;
  }

  .stat-text {
    font-size: 11px;
    color: #717171;
    margin-top: 2px;
  }

  .stat-item--unread .stat-number {
    color: #ff385c;
  }

  .next-arrival {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background-color: #fff8e6;
    border-radius: 8px;
  }

  .arrival-icon {
    width: 20px;
    height: 20px;
    color: #92400e;
    flex-shrink: 0;
  }

  .arrival-info {
    display: flex;
    flex-direction: column;
  }

  .arrival-label {
    font-size: 11px;
    color: #92400e;
  }

  .arrival-date {
    font-size: 14px;
    font-weight: 600;
    color: #78350f;
  }
}

/* Masquer stats sur petits écrans */
.sidebar-stats {
  display: none;
}
</style>
