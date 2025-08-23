<script setup lang="ts">
import { ref, nextTick } from 'vue';
import PricingSection from '../components/PricingSection.vue';
import GallerySection from '../components/GallerySection.vue';
import AvailabilitySection from '../components/AvailabilitySection.vue';
import ContactSection from '../components/ContactSection.vue';
import heroImage from '@/assets/homepage.webp';
import ActivitySection from "@/components/ActivitySection.vue";

const heroTitle = ref('Maison Dalhias 19');
const heroSubtitle = ref('Location de vacances dans le Domaine du Rouret - Pierre & Vacances');

const scrollToElement = (elementId: string) => {
  nextTick(() => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
  });
};

const accommodationFeatures = [
  {
    // Icône pour la surface (règle/mesure)
    icon: 'M19 4h-4L7.11 16.63 4.5 12 9 4H5L.5 12 5 20h4l7.89-12.63L19.5 12 15 20h4l4.5-8z',
    title: 'Surface',
    description: '39m²'
  },
  {
    // Icône pour la capacité (personnes)
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    title: 'Capacité',
    description: 'Jusqu\'à 6 personnes'
  },
  {
    // Icône pour la chambre principale (lit double)
    icon: 'M4 22h16a1 1 0 001-1v-6a1 1 0 00-1-1H4a1 1 0 00-1 1v6a1 1 0 001 1zm15-10H5a2 2 0 110-4h14a2 2 0 110 4z',
    title: 'Chambre principale',
    description: 'Lit 140*200'
  },
  {
    // Icône pour la chambre secondaire (lits jumeaux)
    icon: 'M3 5v14M3 12h4m1 0h4M3 5h7m0 14H3m18 0v-6a3 3 0 00-3-3H8a3 3 0 00-3 3v6h18z',
    title: 'Chambre secondaire',
    description: '2 lits simples'
  },
  {
    // Icône pour le salon (canapé)
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z',
    title: 'Salon',
    description: 'Canapé-lit confortable 160*200'
  }
];
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section id="hero" class="relative h-screen flex items-center justify-center" 
             :style="`background-image: url(${heroImage}); 
                    background-size: cover; 
                    background-position: center;
                    margin-top: -64px;`">
      <div class="absolute inset-0 bg-gradient-to-b from-black/50 to-black/20"></div>
      <div class="container-custom text-center relative z-10">
        <h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          {{ heroTitle }}
        </h1>
        <p class="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto">
          {{ heroSubtitle }}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button @click="scrollToElement('disponibilites')" 
                  class="btn-primary text-lg px-8 py-4">
           Demande de reservation
          </button>
          <button @click="scrollToElement('galerie')"
                  class="bg-white/90 hover:bg-white text-dark px-8 py-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Voir les photos
          </button>
        </div>
      </div>
    </section>

    <!-- Location Info Section -->
    <section class="py-20 bg-background">
      <div class="container-custom">
        <div class="card p-10">
          <div class="max-w-3xl mx-auto">
            <div class="text-center mb-12">
              <h2 class="section-title mb-6">Maison Dalhias 19</h2>
              <p class="text-xl mb-4 text-text/90">Domaine du Rouret - Pierre & Vacances</p>
              <p class="text-lg mb-8 text-text/80">
                Profitez d'un séjour inoubliable dans notre maison située au sein du Domaine du Rouret. 
                Bénéficiez de tout le confort d'un logement privé tout en ayant accès aux installations 
                et activités du domaine Pierre & Vacances.
              </p>
            </div>

            <!-- Accommodation Features -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div v-for="feature in accommodationFeatures" 
                   :key="feature.title"
                   class="flex items-start p-4 bg-white rounded-lg shadow-sm">
                <div class="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                  <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feature.icon" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-dark">{{ feature.title }}</h3>
                  <p class="text-text/80">{{ feature.description }}</p>
                </div>
              </div>
            </div>

            <div class="text-center">
              <button 
                @click="scrollToElement('disponibilites')"
                class="btn-primary"
              >
                Vérifier les disponibilités
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

<!--     Other Sections -->
    <section id="tarifs">
      <PricingSection />
    </section>

    <section id="galerie">
      <GallerySection />
    </section>

    <section id="activites">
      <ActivitySection />
    </section>

    <section id="disponibilites">
      <AvailabilitySection />
    </section>

    <section id="contact">
      <ContactSection />
    </section>
  </div>
</template>

<style scoped>
.section-title {
  @apply text-3xl sm:text-4xl font-bold text-dark;
}

.btn-primary {
  @apply bg-primary text-white px-6 py-3 rounded-lg font-medium 
         hover:bg-primary/90 transition-all duration-200
         focus:outline-none focus:ring-2 focus:ring-primary/50;
}
</style>
