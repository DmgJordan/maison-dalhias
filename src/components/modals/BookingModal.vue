<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import type { CreateClientData, CreateBookingData } from '../../types'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  bookingAdded: []
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const dateConflictError = ref<string | null>(null)

const bookingData = ref<CreateBookingData>({
  start_date: '',
  end_date: '',
  primary_client: {
    first_name: '',
    last_name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    phone: ''
  } as CreateClientData,
  secondary_client: null,
  occupants_count: 1,
  rental_price: 0,
  tourist_tax_included: false,
  cleaning_included: false,
  linen_included: false
})

const hasSecondaryClient = ref(false)

const isFormValid = computed(() => {
  const { start_date, end_date, primary_client, occupants_count, rental_price } = bookingData.value
  
  return start_date && 
         end_date && 
         primary_client.first_name && 
         primary_client.last_name &&
         primary_client.address &&
         primary_client.city &&
         primary_client.postal_code &&
         primary_client.phone &&
         occupants_count > 0 &&
         rental_price >= 0 &&
         !dateConflictError.value
})

// Validation des dates en temps réel
watch([() => bookingData.value.start_date, () => bookingData.value.end_date], async ([startDate, endDate]) => {
  dateConflictError.value = null
  
  if (!startDate || !endDate) return
  
  if (new Date(startDate) >= new Date(endDate)) {
    dateConflictError.value = 'La date de fin doit être postérieure à la date de début'
    return
  }
  
  try {
    const { data } = await supabase.rpc('check_booking_conflicts', {
      p_start_date: startDate,
      p_end_date: endDate
    })
    
    if (!data) {
      dateConflictError.value = 'Ces dates sont déjà réservées'
    }
  } catch (err) {
    console.error('Error checking conflicts:', err)
  }
}, { deep: true })

watch(() => hasSecondaryClient.value, (hasSecondary) => {
  if (hasSecondary && !bookingData.value.secondary_client) {
    bookingData.value.secondary_client = {
      first_name: '',
      last_name: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'France',
      phone: ''
    } as CreateClientData
  } else if (!hasSecondary) {
    bookingData.value.secondary_client = null
  }
})

const resetForm = () => {
  bookingData.value = {
    start_date: '',
    end_date: '',
    primary_client: {
      first_name: '',
      last_name: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'France',
      phone: ''
    } as CreateClientData,
    secondary_client: null,
    occupants_count: 1,
    rental_price: 0,
    tourist_tax_included: false,
    cleaning_included: false,
    linen_included: false
  }
  hasSecondaryClient.value = false
  error.value = null
  dateConflictError.value = null
}

const closeModal = () => {
  resetForm()
  emit('close')
}

const createClient = async (clientData: CreateClientData): Promise<string> => {
  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select('id')
    .single()
  
  if (error) throw error
  return data.id
}

const submitBooking = async () => {
  if (!isFormValid.value) return
  
  try {
    loading.value = true
    error.value = null
    
    // Créer le client principal
    const primaryClientId = await createClient(bookingData.value.primary_client)
    
    // Créer le client secondaire si présent
    let secondaryClientId = null
    if (bookingData.value.secondary_client && hasSecondaryClient.value) {
      secondaryClientId = await createClient(bookingData.value.secondary_client)
    }
    
    // Obtenir l'utilisateur connecté
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Utilisateur non connecté')
    
    // Créer la réservation
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        start_date: bookingData.value.start_date,
        end_date: bookingData.value.end_date,
        primary_client_id: primaryClientId,
        secondary_client_id: secondaryClientId,
        occupants_count: bookingData.value.occupants_count,
        rental_price: bookingData.value.rental_price,
        tourist_tax_included: bookingData.value.tourist_tax_included,
        cleaning_included: bookingData.value.cleaning_included,
        linen_included: bookingData.value.linen_included,
        user_id: userData.user.id
      }])
    
    if (bookingError) throw bookingError
    
    emit('bookingAdded')
    closeModal()
  } catch (err) {
    console.error('Error creating booking:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal"></div>
      
      <!-- Modal -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Ajouter une réservation
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form @submit.prevent="submitBooking">
            <!-- Dates -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Date de début *
                </label>
                <input
                  type="date"
                  v-model="bookingData.start_date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin *
                </label>
                <input
                  type="date"
                  v-model="bookingData.end_date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                >
              </div>
            </div>

            <!-- Erreur de conflit de dates -->
            <div v-if="dateConflictError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p class="text-sm text-red-600">{{ dateConflictError }}</p>
            </div>

            <!-- Client principal -->
            <div class="mb-6">
              <h4 class="text-md font-medium text-gray-900 mb-4">Client principal</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    v-model="bookingData.primary_client.first_name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    v-model="bookingData.primary_client.last_name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                  <input
                    type="text"
                    v-model="bookingData.primary_client.address"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                  <input
                    type="text"
                    v-model="bookingData.primary_client.city"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Code postal *</label>
                  <input
                    type="text"
                    v-model="bookingData.primary_client.postal_code"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Pays *</label>
                  <input
                    type="text"
                    v-model="bookingData.primary_client.country"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    v-model="bookingData.primary_client.phone"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                </div>
              </div>
            </div>

            <!-- Client secondaire -->
            <div class="mb-6">
              <div class="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="hasSecondaryClient"
                  v-model="hasSecondaryClient"
                  class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                >
                <label for="hasSecondaryClient" class="ml-2 text-sm font-medium text-gray-700">
                  Ajouter un client secondaire
                </label>
              </div>

              <div v-if="hasSecondaryClient && bookingData.secondary_client" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    v-model="bookingData.secondary_client.first_name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    v-model="bookingData.secondary_client.last_name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  >
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    v-model="bookingData.secondary_client.address"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    v-model="bookingData.secondary_client.city"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input
                    type="text"
                    v-model="bookingData.secondary_client.postal_code"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <input
                    type="text"
                    v-model="bookingData.secondary_client.country"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    v-model="bookingData.secondary_client.phone"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  >
                </div>
              </div>
            </div>

            <!-- Détails de la réservation -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre d'occupants *</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  v-model="bookingData.occupants_count"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Prix du loyer (€) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  v-model="bookingData.rental_price"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                >
              </div>
            </div>

            <!-- Options -->
            <div class="mb-6">
              <h4 class="text-md font-medium text-gray-900 mb-4">Services inclus</h4>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="touristTax"
                    v-model="bookingData.tourist_tax_included"
                    class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  >
                  <label for="touristTax" class="ml-2 text-sm text-gray-700">
                    Taxe de séjour incluse
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="cleaning"
                    v-model="bookingData.cleaning_included"
                    class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  >
                  <label for="cleaning" class="ml-2 text-sm text-gray-700">
                    Ménage inclus
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="linen"
                    v-model="bookingData.linen_included"
                    class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  >
                  <label for="linen" class="ml-2 text-sm text-gray-700">
                    Linge de maison inclus
                  </label>
                </div>
              </div>
            </div>

            <!-- Erreur générale -->
            <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>

            <!-- Actions -->
            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="!isFormValid || loading"
                class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ loading ? 'Création...' : 'Créer la réservation' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>