import { createRouter, createWebHistory } from 'vue-router';
import { authApi } from '../lib/api';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import AdminLayout from '../views/admin/AdminLayout.vue';
import BookingsView from '../views/admin/BookingsView.vue';
import MessagesView from '../views/admin/MessagesView.vue';
import NewBookingView from '../views/admin/NewBookingView.vue';

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
        path: 'messages',
        name: 'AdminMessages',
        component: MessagesView,
      },
      {
        path: 'nouveau',
        name: 'AdminNewBooking',
        component: NewBookingView,
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
