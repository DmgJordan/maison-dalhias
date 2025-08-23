<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import homepageImage from '@/assets/homepage.png'
import logoImage from '@/assets/pierre-vacance.png'
interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  user_id: string;
}

interface ContactForm {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  status: string;
}

const router = useRouter()
const bookings = ref<Booking[]>([])
const contactForms = ref<ContactForm[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref('bookings')
const newBooking = ref({
  startDate: '',
  endDate: ''
})

const pricingPeriods = [
  {
    name: 'Basse Saison',
    dates: 'Du 05 Avril au 03 Mai / Du 30 Août au 27 Septembre',
    price: 320,
    pricePerNight: 60
  },
  {
    name: 'Moyenne Saison',
    dates: 'Du 03 Mai au 28 Juin',
    price: 400,
    pricePerNight: 80
  },
  {
    name: 'Haute Saison',
    dates: 'Du 28 Juin au 13 Juillet',
    price: 650,
    pricePerNight: 120
  },
  {
    name: 'Très Haute Saison',
    dates: 'Du 13 Juillet au 26 Juillet',
    price: 750,
    pricePerNight: 150
  },
  {
    name: 'Pleine Saison',
    dates: 'Du 26 Juillet au 23 Août',
    price: 950,
    pricePerNight: 180
  }
]

const amenities = [
  'Cuisine équipée',
  'Accès piscine',
  'WiFi gratuit',
  'Parking gratuit',
  'Animations quotidiennes',
  'Vue panoramique',
  'Terrasse privative',
  'Accès aux installations du domaine'
]

const accommodationDetails = [
  'Surface : 39m²',
  'Capacité maximale : 6 personnes',
  'Chambre principale avec lit 140*200',
  'Chambre secondaire avec 2 lits simples',
  'Salon avec canapé-lit confortable 160*200'

]

const loadImage = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const aspectRatio = img.width / img.height;
      canvas.width = 1700;
      canvas.height = canvas.width / aspectRatio;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Effacer le canvas avec un fond transparent avant de dessiner l'image
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // Pour les PNG, utiliser PNG comme format de sortie pour préserver la transparence
      const isTransparentPng = url.toLowerCase().endsWith('.png');
      const format = isTransparentPng ? 'image/png' : 'image/jpeg';
      const quality = isTransparentPng ? 1.0 : 0.95;

      resolve(canvas.toDataURL(format, quality));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const generatePromotionalPDF = async () => {
  try {
    loading.value = true;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const websiteUrl = window.location.origin;
    const qrCodeDataUrl = await QRCode.toDataURL(websiteUrl);
    const imageDataUrl = await loadImage(homepageImage);
    const logoDataUrl = await loadImage(logoImage);

    // Fond blanc pour tout l'en-tête
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');

    // Ligne de séparation fine en bas de l'en-tête
    doc.setDrawColor(200, 200, 200);
    doc.line(0, 50, 210, 50);

    // Titre principal en couleur rouge (l'ancienne couleur du fond)
    doc.setTextColor(237, 66, 86); // Rouge de l'ancien fond
    doc.setFontSize(30);
    doc.text('Maison Dalhias 19', 15, 25);
    doc.setFontSize(18);
    doc.text('Village Vacances Le Rouret - Ardèche', 15, 35);

    // Logo Pierre & Vacances à droite
    const logoWidth = 50;
    const logoHeight = 30;
    doc.addImage(
        logoDataUrl,
        'PNG',
        150,
        10,
        logoWidth,
        logoHeight
    );

    // Image principale sous l'en-tête
    const imageWidth = 180;
    const imageHeight = 80;
    doc.addImage(
        imageDataUrl,
        'JPEG',
        15,
        60,
        imageWidth,
        imageHeight,
        undefined,
        'MEDIUM'
    );

    // Description
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Découvrez notre magnifique location de vacances au cœur de l\'Ardèche,', 15, 155);
    doc.text('dans le Domaine du Rouret - Pierre & Vacances.', 15, 162);

    // Section Hébergement - avec couleur plus sobre
    doc.setFillColor(248, 248, 248);
    doc.rect(15, 175, 180, 35, 'F');
    doc.setTextColor(237, 66, 86); // On garde cette couleur pour les titres de section
    doc.setFontSize(14);
    doc.text('Hébergement', 20, 185);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    let yPos = 192;
    accommodationDetails.forEach((detail, index) => {
      if (index % 2 === 0) {
        doc.text(`• ${detail}`, 20, yPos);
      } else {
        doc.text(`• ${detail}`, 110, yPos);
        yPos += 7;
      }
    });

    // Section Services - avec couleur plus sobre pour la barre de titre
    doc.setFillColor(237, 66, 86);
    doc.setTextColor(255, 255, 255);
    doc.rect(15, 220, 180, 8, 'F');
    doc.setFontSize(14);
    doc.text('Services inclus', 20, 225);

    // Liste des services
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    yPos = 235;
    amenities.forEach((amenity, index) => {
      if (index % 2 === 0) {
        doc.text(`• ${amenity}`, 20, yPos);
      } else {
        doc.text(`• ${amenity}`, 110, yPos);
        yPos += 7;
      }
    });

    // Section Contact et QR Code
    doc.setFillColor(248, 248, 248);
    doc.rect(0, 260, 210, 37, 'F');

    // QR Code avec texte explicatif
    doc.addImage(qrCodeDataUrl, 'PNG', 15, 265, 30, 30);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Scannez ce QR code pour consulter', 50, 275);
    doc.text('nos tarifs et disponibilités en ligne', 50, 280);
    doc.text('sur notre site web', 50, 285);

    // Informations de contact
    doc.setTextColor(255, 56, 92);
    doc.setFontSize(12);
    doc.text('Contact', 140, 275);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('Tél: +33 7 87 86 43 58', 140, 282);
    doc.text('Email: dominguez-juan@orange.fr', 140, 289);

    doc.save('maison-dalhias-19-presentation.pdf');
  } catch (err) {
    console.error('Error generating PDF:', err);
    error.value = err instanceof Error ? err.message : 'Erreur lors de la génération du PDF';
  } finally {
    loading.value = false;
  }
};

const goToHome = () => {
  window.location.href = '/';
}

const fetchBookings = async () => {
  try {
    loading.value = true
    const { data, error: err } = await supabase
      .from('bookings')
      .select('*')
      .order('start_date', { ascending: true })
    
    if (err) throw err
    
    if (data) {
      bookings.value = data
    }
  } catch (err) {
    console.error('Error fetching bookings:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const fetchContactForms = async () => {
  try {
    loading.value = true
    const { data, error: err } = await supabase
      .from('contact_forms')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (err) throw err
    
    if (data) {
      contactForms.value = data
    }
  } catch (err) {
    console.error('Error fetching contact forms:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const addBooking = async () => {
  try {
    loading.value = true
    const { data: userData } = await supabase.auth.getUser()
    
    if (!userData.user) {
      throw new Error('Utilisateur non connecté')
    }

    const { error: err } = await supabase
      .from('bookings')
      .insert([
        {
          start_date: newBooking.value.startDate,
          end_date: newBooking.value.endDate,
          user_id: userData.user.id
        }
      ])
    
    if (err) throw err
    
    await fetchBookings()
    newBooking.value = { startDate: '', endDate: '' }
  } catch (err) {
    console.error('Error adding booking:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const confirmBooking = async (id: string) => {
  try {
    loading.value = true
    const { error: err } = await supabase
      .rpc('confirm_booking', { booking_id: id })
    
    if (err) throw err
    await fetchBookings()
  } catch (err) {
    console.error('Error confirming booking:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const deleteBooking = async (id: string) => {
  try {
    loading.value = true
    const { error: err } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
    
    if (err) throw err
    await fetchBookings()
  } catch (err) {
    console.error('Error deleting booking:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const markAsRead = async (id: string) => {
  try {
    loading.value = true
    const { error: err } = await supabase
      .from('contact_forms')
      .update({ status: 'read' })
      .eq('id', id)
    
    if (err) throw err
    await fetchContactForms()
  } catch (err) {
    console.error('Error marking as read:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

const signOut = async () => {
  try {
    const { error: err } = await supabase.auth.signOut()
    if (err) throw err
    router.push('/login')
  } catch (err) {
    console.error('Error signing out:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  }
}

onMounted(() => {
  fetchBookings()
  fetchContactForms()
})
</script>

<template>
  <div class="min-h-screen bg-background py-16">
    <div class="container-custom">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold text-dark">Administration</h1>
          <div class="flex gap-4">
            <button @click="generatePromotionalPDF" class="btn-primary" :disabled="loading">
              {{ loading ? 'Génération...' : 'Générer l\'affiche PDF' }}
            </button>
            <button @click="goToHome" class="btn-secondary">
              Retour au site
            </button>
            <button @click="signOut" class="btn-secondary">
              Déconnexion
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-200 mb-8">
          <nav class="-mb-px flex space-x-8">
            <button
              @click="activeTab = 'bookings'"
              class="py-4 px-1 border-b-2 font-medium text-sm"
              :class="activeTab === 'bookings' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              Réservations
            </button>
            <button
              @click="activeTab = 'contacts'"
              class="py-4 px-1 border-b-2 font-medium text-sm"
              :class="activeTab === 'contacts' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              Messages de contact
            </button>
          </nav>
        </div>

        <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {{ error }}
        </div>

        <!-- Bookings Tab -->
        <div v-if="activeTab === 'bookings'">
          <!-- Formulaire d'ajout -->
          <div class="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 class="text-xl font-semibold mb-4">Ajouter une réservation</h2>
            <form @submit.prevent="addBooking" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  v-model="newBooking.startDate"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  v-model="newBooking.endDate"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                >
              </div>
              <div class="md:col-span-2">
                <button type="submit" class="btn-primary w-full" :disabled="loading">
                  {{ loading ? 'Ajout en cours...' : 'Ajouter la réservation' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Liste des réservations -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de début
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de fin
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="booking in bookings" :key="booking.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ new Date(booking.start_date).toLocaleDateString() }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ new Date(booking.end_date).toLocaleDateString() }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                          :class="{
                            'bg-green-100 text-green-800': booking.status === 'confirmed',
                            'bg-yellow-100 text-yellow-800': booking.status === 'pending'
                          }">
                      {{ booking.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <button v-if="booking.status === 'pending'"
                            @click="confirmBooking(booking.id)" 
                            class="text-green-600 hover:text-green-900">
                      Confirmer
                    </button>
                    <button @click="deleteBooking(booking.id)" 
                            class="text-red-600 hover:text-red-900">
                      Supprimer
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Contacts Tab -->
        <div v-else-if="activeTab === 'contacts'" class="space-y-6">
          <div class="grid grid-cols-1 gap-6">
            <!-- Messages non lus -->
            <div v-if="contactForms.filter(f => f.status === 'sent').length > 0" 
                 class="bg-yellow-50 p-6 rounded-lg">
              <h3 class="text-lg font-semibold text-yellow-800 mb-4">Messages non lus</h3>
              <div class="space-y-4">
                <div v-for="form in contactForms.filter(f => f.status === 'sent')" 
                     :key="form.id"
                     class="bg-white p-6 rounded-lg shadow">
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h4 class="font-semibold">{{ form.subject }}</h4>
                      <p class="text-sm text-gray-500">
                        De {{ form.name }} ({{ form.email }})
                      </p>
                      <p class="text-sm text-gray-500">
                        {{ new Date(form.created_at).toLocaleString() }}
                      </p>
                    </div>
                    <button 
                      @click="markAsRead(form.id)"
                      class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200"
                    >
                      Marquer comme lu
                    </button>
                  </div>
                  <p class="text-gray-700 whitespace-pre-line">{{ form.message }}</p>
                </div>
              </div>
            </div>

            <!-- Messages lus -->
            <div v-if="contactForms.filter(f => f.status === 'read').length > 0" 
                 class="bg-gray-50 p-6 rounded-lg">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Messages lus</h3>
              <div class="space-y-4">
                <div v-for="form in contactForms.filter(f => f.status === 'read')" 
                     :key="form.id"
                     class="bg-white p-6 rounded-lg shadow">
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h4 class="font-semibold">{{ form.subject }}</h4>
                      <p class="text-sm text-gray-500">
                        De {{ form.name }} ({{ form.email }})
                      </p>
                      <p class="text-sm text-gray-500">
                        {{ new Date(form.created_at).toLocaleString() }}
                      </p>
                    </div>
                  </div>
                  <p class="text-gray-700 whitespace-pre-line">{{ form.message }}</p>
                </div>
              </div>
            </div>

            <!-- Aucun message -->
            <div v-if="contactForms.length === 0" 
                 class="text-center py-8 text-gray-500">
              Aucun message de contact pour le moment.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary {
  @apply bg-primary text-white px-6 py-3 rounded-lg font-medium 
         hover:bg-primary/90 transition-all duration-200
         focus:outline-none focus:ring-2 focus:ring-primary/50
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium 
         hover:bg-gray-300 transition-all duration-200
         focus:outline-none focus:ring-2 focus:ring-gray-200;
}
</style>
