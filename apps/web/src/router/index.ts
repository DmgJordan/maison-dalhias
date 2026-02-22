import { createRouter, createWebHistory } from 'vue-router';
import { authApi } from '../lib/api';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';

// Lazy loading des composants admin pour optimiser les performances
const AdminLayout = (): Promise<typeof import('../views/admin/AdminLayout.vue')> =>
  import('../views/admin/AdminLayout.vue');
const BookingsView = (): Promise<typeof import('../views/admin/BookingsView.vue')> =>
  import('../views/admin/BookingsView.vue');
const BookingDetailView = (): Promise<typeof import('../views/admin/BookingDetailView.vue')> =>
  import('../views/admin/BookingDetailView.vue');
const MessagesView = (): Promise<typeof import('../views/admin/MessagesView.vue')> =>
  import('../views/admin/MessagesView.vue');
const NewBookingView = (): Promise<typeof import('../views/admin/NewBookingView.vue')> =>
  import('../views/admin/NewBookingView.vue');
const BookingTypeSelector = (): Promise<typeof import('../views/admin/BookingTypeSelector.vue')> =>
  import('../views/admin/BookingTypeSelector.vue');
const QuickBookingStep1 = (): Promise<typeof import('../views/admin/QuickBookingStep1.vue')> =>
  import('../views/admin/QuickBookingStep1.vue');
const QuickBookingStep2 = (): Promise<typeof import('../views/admin/QuickBookingStep2.vue')> =>
  import('../views/admin/QuickBookingStep2.vue');
const QuickBookingSuccess = (): Promise<typeof import('../views/admin/QuickBookingSuccess.vue')> =>
  import('../views/admin/QuickBookingSuccess.vue');
const PricingView = (): Promise<typeof import('../views/admin/PricingView.vue')> =>
  import('../views/admin/PricingView.vue');

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/admin/reservations',
      },
      {
        path: 'reservations',
        name: 'AdminBookings',
        component: BookingsView,
      },
      {
        path: 'reservations/:id',
        name: 'AdminBookingDetail',
        component: BookingDetailView,
      },
      {
        path: 'messages',
        name: 'AdminMessages',
        component: MessagesView,
      },
      {
        path: 'nouveau',
        name: 'AdminNewBooking',
        component: BookingTypeSelector,
      },
      {
        path: 'nouveau/direct',
        name: 'AdminNewBookingDirect',
        component: NewBookingView,
      },
      {
        path: 'nouveau/rapide/1',
        name: 'AdminQuickBookingStep1',
        component: QuickBookingStep1,
      },
      {
        path: 'nouveau/rapide/2',
        name: 'AdminQuickBookingStep2',
        component: QuickBookingStep2,
      },
      {
        path: 'nouveau/rapide/succes',
        name: 'AdminQuickBookingSuccess',
        component: QuickBookingSuccess,
      },
      {
        path: 'tarifs',
        name: 'AdminPricing',
        component: PricingView,
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, _savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    }
    return { top: 0 };
  },
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isAuthenticated = authApi.isAuthenticated();

  if (requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
