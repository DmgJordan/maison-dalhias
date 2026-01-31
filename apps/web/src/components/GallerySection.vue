<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface GalleryImage {
  src: string;
  thumbnail: string;
  alt: string;
  description?: string;
}

// Import des images sources
import bathroom from '@/assets/gallery/sources/bathroom.png';
import bedroom1 from '@/assets/gallery/sources/bedroom1.png';
import bedroom2 from '@/assets/gallery/sources/bedroom2.png';
import closedSofa from '@/assets/gallery/sources/closed-sofa.jpg';
import cuisine from '@/assets/gallery/sources/cuisine.png';
import openedSofa from '@/assets/gallery/sources/opened-sofa.jpg';
import panorama from '@/assets/gallery/sources/panorama.png';
import salon from '@/assets/gallery/sources/salon.png';
import terasse from '@/assets/gallery/sources/terasse.jpg';
import devanture from '@/assets/gallery/sources/devanture.png';

// Import des thumbnails WebP optimisés
import bathroomThumb from '@/assets/gallery/thumbnails/bathroom.webp';
import bedroom1Thumb from '@/assets/gallery/thumbnails/bedroom1.webp';
import bedroom2Thumb from '@/assets/gallery/thumbnails/bedroom2.webp';
import cuisineThumb from '@/assets/gallery/thumbnails/cuisine.webp';
import panoramaThumb from '@/assets/gallery/thumbnails/panorama.webp';
import salonThumb from '@/assets/gallery/thumbnails/salon.webp';
import terasseThumb from '@/assets/gallery/thumbnails/terasse.webp';
import devantureThumb from '@/assets/gallery/thumbnails/devanture.webp';

const galleryImages = ref<GalleryImage[]>([
  {
    src: devanture,
    thumbnail: devantureThumb,
    alt: 'Façade du logement',
    description: "Vue extérieure de la propriété depuis l'entrée du domaine.",
  },
  {
    src: panorama,
    thumbnail: panoramaThumb,
    alt: 'Vue panoramique depuis le logement',
    description: 'Vue extérieure depuis la propriété.',
  },
  {
    src: salon,
    thumbnail: salonThumb,
    alt: 'Salon du logement',
    description: 'Espace salon pour vous détendre pendant votre séjour.',
  },
  {
    src: closedSofa,
    thumbnail: closedSofa,
    alt: 'Canapé du salon',
    description: "Canapé confortable dans l'espace salon.",
  },
  {
    src: openedSofa,
    thumbnail: openedSofa,
    alt: 'Canapé-lit ouvert',
    description: 'Canapé convertible offrant un couchage supplémentaire.',
  },
  {
    src: cuisine,
    thumbnail: cuisineThumb,
    alt: 'Cuisine du logement',
    description: 'Cuisine équipée avec tout le nécessaire pour préparer vos repas.',
  },
  {
    src: bedroom1,
    thumbnail: bedroom1Thumb,
    alt: 'Première chambre du logement',
    description: 'Chambre principale avec lit confortable et rangements.',
  },
  {
    src: bedroom2,
    thumbnail: bedroom2Thumb,
    alt: 'Deuxième chambre du logement',
    description: 'Seconde chambre adaptée pour votre séjour.',
  },
  {
    src: bathroom,
    thumbnail: bathroomThumb,
    alt: 'Salle de bain du logement',
    description: 'Salle de bain équipée et fonctionnelle pour votre confort.',
  },
  {
    src: terasse,
    thumbnail: terasseThumb,
    alt: 'Terrasse du logement',
    description: 'Espace extérieur aménagé pour profiter du plein air.',
  },
]);

const selectedImageIndex = ref<number>(0);
const isModalOpen = ref(false);

const openModal = (index: number) => {
  selectedImageIndex.value = index;
  isModalOpen.value = true;
  document.body.classList.add('overflow-hidden');
};

const closeModal = () => {
  isModalOpen.value = false;
  document.body.classList.remove('overflow-hidden');
};

const nextImage = (event?: Event) => {
  if (event) event.stopPropagation();
  selectedImageIndex.value = (selectedImageIndex.value + 1) % galleryImages.value.length;
};

const prevImage = (event?: Event) => {
  if (event) event.stopPropagation();
  selectedImageIndex.value =
    (selectedImageIndex.value - 1 + galleryImages.value.length) % galleryImages.value.length;
};

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (!isModalOpen.value) return;

    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      prevImage();
    }
  });
});
</script>

<template>
  <div class="min-h-screen py-16 bg-white">
    <div class="container-custom">
      <h1 class="text-4xl font-bold text-center text-dark mb-12">Galerie</h1>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="(image, index) in galleryImages"
          :key="index"
          class="aspect-square overflow-hidden relative group cursor-pointer rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          @click="openModal(index)"
        >
          <img
            :src="image.thumbnail"
            :alt="image.alt"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          >
            <span class="text-white text-sm font-medium px-3 py-2 bg-black/50 rounded-lg">
              {{ image.alt }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal pour afficher l'image en grand avec navigation -->
  <div
    v-if="isModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
    @click="closeModal"
  >
    <div
      class="relative max-w-5xl w-full bg-transparent rounded-lg overflow-hidden shadow-2xl transform transition-all"
      :class="isModalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
      @click.stop
    >
      <button
        class="absolute top-4 right-4 z-10 text-white/80 hover:text-white transition-colors"
        @click="closeModal"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <!-- Boutons de navigation -->
      <button
        class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-12 h-12 rounded-full flex items-center justify-center z-10 transition-colors"
        @click="prevImage"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <button
        class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-12 h-12 rounded-full flex items-center justify-center z-10 transition-colors"
        @click="nextImage"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div v-if="isModalOpen" class="flex flex-col">
        <div class="w-full">
          <img
            :src="galleryImages[selectedImageIndex].src"
            :alt="galleryImages[selectedImageIndex].alt"
            class="w-full h-auto max-h-[80vh] object-contain transition-opacity duration-300"
          />
        </div>
        <div class="bg-black/80 p-4 text-white">
          <h3 class="text-xl font-bold mb-2">{{ galleryImages[selectedImageIndex].alt }}</h3>
          <p v-if="galleryImages[selectedImageIndex].description" class="text-white/80">
            {{ galleryImages[selectedImageIndex].description }}
          </p>
          <div class="flex justify-center mt-4">
            <span class="text-sm text-white/60">
              {{ selectedImageIndex + 1 }} / {{ galleryImages.length }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
