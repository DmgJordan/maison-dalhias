<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isMenuOpen = ref(false);

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const scrollToSection = (sectionId: string) => {
  isMenuOpen.value = false;
  // Si nous sommes sur la page d'accueil, utiliser scrollIntoView
  if (router.currentRoute.value.path === '/') {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  } else {
    // Si nous sommes sur une autre page, naviguer vers la page d'accueil avec un hash
    router.push({ path: '/', hash: `#${sectionId}` });
  }
};

const navigateTo = (route: string) => {
  isMenuOpen.value = false;
  router.push(route);
};
</script>

<template>
  <nav class="bg-white shadow-md fixed w-full top-0 z-50">
    <div class="container-custom">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <a class="flex items-center cursor-pointer" @click="navigateTo('/')">
          <span class="text-xl font-bold text-primary">Maison Dalhias</span>
        </a>

        <!-- Mobile menu button -->
        <button
          class="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
          @click="toggleMenu"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              v-if="!isMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex md:items-center md:space-x-6">
          <a
            v-for="item in ['tarifs', 'galerie', 'activites', 'disponibilites', 'contact']"
            :key="item"
            class="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer"
            @click="scrollToSection(item)"
          >
            {{ item.charAt(0).toUpperCase() + item.slice(1) }}
          </a>

          <a
            class="px-3 py-2 border border-gray-300 rounded-md text-gray-600 hover:border-primary hover:text-primary transition-all duration-200 cursor-pointer bg-white hover:bg-gray-50"
            @click="navigateTo('/admin')"
          >
            🔐 Administration
          </a>

          <button class="btn-primary" @click="scrollToSection('disponibilites')">
            Demande de reservation
          </button>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <div v-show="isMenuOpen" class="md:hidden">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <a
            v-for="item in ['tarifs', 'galerie', 'activites', 'disponibilites', 'contact']"
            :key="item"
            class="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-primary hover:bg-gray-50 cursor-pointer"
            @click="scrollToSection(item)"
          >
            {{ item.charAt(0).toUpperCase() + item.slice(1) }}
          </a>

          <a
            class="block px-3 py-2 rounded-md text-base font-medium border border-gray-300 text-gray-600 hover:border-primary hover:text-primary hover:bg-gray-50 cursor-pointer transition-all duration-200"
            @click="navigateTo('/admin')"
          >
            🔐 Administration
          </a>

          <button class="w-full btn-primary mt-4" @click="scrollToSection('disponibilites')">
            Demande de reservation
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.container-custom {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.btn-primary {
  @apply bg-primary text-white px-4 py-2 rounded-lg font-medium
  hover:bg-primary/90 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-primary/50;
}
</style>
