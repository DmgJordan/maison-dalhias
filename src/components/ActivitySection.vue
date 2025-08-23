<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Définition du type pour les images de la galerie
interface GalleryImage {
  id: number
  src: string
  alt: string
  isMain?: boolean
}

// Images pour la galerie (placeholders - à remplacer par vos propres images)
const galleryImages = ref<GalleryImage[]>([
  { id: 1, src: 'https://photos.pierreetvacances.com/admin/fp2/photos/panopv/1440x810/AAA_124592_panopv.jpg', alt: 'Espace aquatique', isMain: true },
  { id: 2, src: 'https://photos.pierreetvacances.com/admin/fp2/photos/43/500x375/AAA_137135_43.jpg', alt: 'Club enfants' },
  { id: 3, src: 'https://photos.pierreetvacances.com/admin/fp2/photos/43/500x375/AAA_137118_43.jpg', alt: 'Activités sportives' },
  { id: 4, src: 'https://photos.pierreetvacances.com/admin/fp2/photos/43/800x600/AAA_173718_43.jpg', alt: 'Réserve naturelle' },
  { id: 5, src: 'https://photos.pierreetvacances.com/admin/fp2/photos/43/800x600/AAA_164660_43.jpg', alt: 'Animations' }
])

// Fonction pour changer l'image principale
const setMainImage = (imageId: number) => {
  const currentMain = galleryImages.value.find(img => img.isMain)
  const newMain = galleryImages.value.find(img => img.id === imageId)

  if (currentMain) currentMain.isMain = false
  if (newMain) newMain.isMain = true
}

// Activités principales sélectionnées
const mainActivities = [
  {
    title: "Espaces aquatiques",
    description: "Profitez de 2 espaces aquatiques : un espace de 650m² avec rivière sauvage à bouée et un second espace comprenant une piscine extérieure de nage de 350m² et une piscine californienne.",
    icon: "water"
  },
  {
    title: "Clubs enfants & ados",
    description: "Vos enfants (3-11 ans) et adolescents (12-17 ans) s'amuseront avec des activités encadrées par des animateurs diplômés : chasses au trésor, activités créatives, animations sportives et soirées thématiques.",
    icon: "users"
  },
  {
    title: "Animations gratuites",
    description: "Profitez d'un programme d'animations variées : blind test, mini-disco, jeux en famille, soirées dansantes et spectacles pour tous les âges.",
    icon: "music"
  },
  {
    title: "Equipements sportifs",
    description: "De nombreux équipements à votre disposition : terrain multisports, beach-volley, pétanque, tennis de table et séances de fitness, yoga, pilates et aquagym.",
    icon: "activity"
  },
  {
    title: "Réserve naturelle",
    description: "Découvrez les magnifiques paysages de l'Ardèche : Gorges de l'Ardèche, grotte Chauvet et parc naturel des Monts d'Ardèche à proximité immédiate.",
    icon: "tree"
  }
]

// Référence pour la vidéo (à remplacer par votre ID de vidéo YouTube)
const videoUrl = ref("https://player.vimeo.com/video/1060941273?autoplay=1")

// État pour tracker si la section village est visible
const showVillageSection = ref(false)

// Fonction pour basculer vers la page complète du village
const goToVillagePage = () => {
  // Redirection vers la page du village (à adapter selon votre routeur)
  window.location.href = 'https://www.pierreetvacances.com/fr-fr/fp_RUL_location-village-le-rouret'
}
</script>

<template>
  <section id="activites" class="py-16 bg-gray-50">
    <div class="container-custom">
      <h2 class="text-3xl font-bold text-center text-dark mb-2">Activités du Village</h2>
      <p class="text-center text-text/80 mb-8">Découvrez toutes les activités disponibles au Domaine du Rouret</p>

      <div class="flex flex-col lg:flex-row gap-8 mb-12">
        <!-- Galerie de photos (grande image + 4 petites) -->
        <div class="w-full lg:w-1/2">
          <div class="mb-4">
            <img
                :src="galleryImages.find(img => img.isMain)?.src"
                :alt="galleryImages.find(img => img.isMain)?.alt"
                class="w-full h-64 lg:h-96 object-cover rounded-lg shadow-md"
            />
          </div>
          <div class="grid grid-cols-4 gap-2">
            <div
                v-for="image in galleryImages.filter(img => !img.isMain)"
                :key="image.id"
                @click="setMainImage(image.id)"
                class="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                  :src="image.src"
                  :alt="image.alt"
                  class="w-full h-20 lg:h-24 object-cover rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>

        <!-- Vidéo et logo -->
        <div class="w-full lg:w-1/2">
          <div class="bg-white rounded-lg shadow-md p-4 mb-6">
            <div class="aspect-w-16 aspect-h-9">
              <iframe
                  class="w-full h-64 lg:h-72 rounded"
                  :src="videoUrl"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
              ></iframe>
            </div>
          </div>

          <!-- Logo Pierre & Vacances -->
          <div class="flex justify-center mb-6">
            <img
                src="https://news.groupepvcp.com/wp-content/uploads/2023/03/f0095a190adede1509847068039e6da7-1500x646-1.png"
                alt="Logo Pierre & Vacances"
                class="mt-8 h-24 object-contain"
            />
          </div>

          <!-- Bouton pour la page dédiée -->
<!--          <div class="text-center">-->
<!--            <button @click="goToVillagePage" class="btn-primary">-->
<!--              Découvrir toutes les informations du village-->
<!--            </button>-->
<!--          </div>-->
        </div>
      </div>

      <!-- Activités principales -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
            v-for="activity in mainActivities"
            :key="activity.title"
            class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div class="flex items-start mb-4">
            <div class="bg-primary/10 p-3 rounded-full mr-4">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <!-- Icônes simplifiées -->

                <path
                    v-if="activity.icon === 'water'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 10c2 0 4 1 6 0 2-1 4 0 6 1 2 1 4-1 4-1M4 14c2 0 4 1 6 0 2-1 4 0 6 1 2 1 4-1 4-1"
                />
                <path
                    v-else-if="activity.icon === 'users'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
                <path
                    v-else-if="activity.icon === 'music'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
                <path
                    v-else-if="activity.icon === 'activity'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                />
                <path
                    v-else-if="activity.icon === 'tree'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 12s2-3 5-3 5 3 5 3M8 8c2.282-2.282 5.718-2.282 8 0M12 5c0-1.657-1.343-3-3-3S6 3.343 6 5"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold text-dark mb-2">{{ activity.title }}</h3>
              <p class="text-text/80">{{ activity.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.btn-primary {
  @apply bg-primary text-white px-6 py-3 rounded-lg font-medium
  hover:bg-primary/90 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-primary/50;
}

/* Support pour les proportions vidéo */
.aspect-w-16 {
  position: relative;
  padding-bottom: 56.25%;
}

.aspect-w-16 iframe {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
