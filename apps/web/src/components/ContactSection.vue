<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { contactsApi } from '../lib/api';
import { required, email as emailRule, phone as phoneRule } from '../utils/validation';
import { useFormValidation } from '../composables/useFormValidation';

const form = ref({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
});

const validation = useFormValidation({
  schema: {
    name: [required('Le nom est requis')],
    email: [required("L'email est requis"), emailRule()],
    phone: [required('Le numéro de téléphone est requis'), phoneRule()],
    subject: [required('Le sujet est requis')],
    message: [required('Le message est requis')],
  },
  formData: form,
});

const loading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);
const showSnackbar = ref(false);
const snackbarMessage = ref('');
const snackbarClass = ref('bg-primary');

const showNotification = (message: string, isError = false): void => {
  snackbarMessage.value = message;
  showSnackbar.value = true;
  snackbarClass.value = isError ? 'bg-red-500' : 'bg-green-500';
  setTimeout(() => {
    showSnackbar.value = false;
  }, 5000);
};

const handleSubmit = async (): Promise<void> => {
  if (!validation.attemptSubmit()) return;

  try {
    loading.value = true;
    error.value = null;
    success.value = false;

    await contactsApi.create({
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone || undefined,
      subject: form.value.subject,
      message: form.value.message,
    });

    success.value = true;
    showNotification(
      'Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.'
    );
    form.value = {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    };
    validation.resetTouched();
  } catch (err: unknown) {
    console.error('Error sending message:', err);
    error.value =
      err instanceof Error
        ? err.message
        : "Une erreur est survenue lors de l'envoi du message. Veuillez nous contacter directement par téléphone au +33787864358.";
    showNotification(error.value, true);
  } finally {
    loading.value = false;
  }
};

interface ContactFormDetail {
  subject: string;
  message: string;
}

onMounted(() => {
  const handleUpdateContactForm = (event: Event): void => {
    const customEvent = event as CustomEvent<ContactFormDetail>;
    form.value.subject = customEvent.detail.subject;
    form.value.message = customEvent.detail.message;

    const nameInput = document.getElementById('name') as HTMLInputElement | null;
    if (nameInput) {
      nameInput.focus();
    }
  };

  window.addEventListener('updateContactForm', handleUpdateContactForm);
});
</script>

<template>
  <div id="contact" class="min-h-screen py-16 bg-white">
    <div class="container-custom">
      <h1 class="text-4xl font-bold text-center text-dark mb-8">Contactez-nous</h1>
      <div class="max-w-2xl mx-auto bg-background rounded-lg shadow-lg p-8">
        <!-- Snackbar -->
        <div
          v-if="showSnackbar"
          class="fixed bottom-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300"
          :class="[
            snackbarClass,
            { 'translate-y-0 opacity-100': showSnackbar, 'translate-y-8 opacity-0': !showSnackbar },
          ]"
        >
          {{ snackbarMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="success" class="mb-6 p-4 bg-green-50 text-green-700 rounded-lg">
          Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {{ error }}
          <div class="mt-2 text-sm">
            Vous pouvez nous joindre directement par téléphone au
            <a href="tel:+33787864358" class="text-red-700 underline">+33 7 87 86 43 58</a>
          </div>
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              Nom <span class="text-red-500">*</span>
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              :class="{ 'border-red-500 focus:ring-red-500': validation.hasFieldError('name') }"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              @blur="validation.touchField('name')"
            />
            <p v-if="validation.fieldError('name')" class="mt-1 text-sm text-red-500">
              {{ validation.fieldError('name') }}
            </p>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email <span class="text-red-500">*</span>
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              :class="{ 'border-red-500 focus:ring-red-500': validation.hasFieldError('email') }"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              @blur="validation.touchField('email')"
            />
            <p v-if="validation.fieldError('email')" class="mt-1 text-sm text-red-500">
              {{ validation.fieldError('email') }}
            </p>
          </div>

          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
              Téléphone <span class="text-red-500">*</span>
            </label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              :class="{ 'border-red-500 focus:ring-red-500': validation.hasFieldError('phone') }"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="Ex: 0612345678"
              @blur="validation.touchField('phone')"
            />
            <p v-if="validation.fieldError('phone')" class="mt-1 text-sm text-red-500">
              {{ validation.fieldError('phone') }}
            </p>
          </div>

          <div>
            <label for="subject" class="block text-sm font-medium text-gray-700 mb-1">
              Sujet <span class="text-red-500">*</span>
            </label>
            <input
              id="subject"
              v-model="form.subject"
              type="text"
              :class="{ 'border-red-500 focus:ring-red-500': validation.hasFieldError('subject') }"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              @blur="validation.touchField('subject')"
            />
            <p v-if="validation.fieldError('subject')" class="mt-1 text-sm text-red-500">
              {{ validation.fieldError('subject') }}
            </p>
          </div>

          <div>
            <label for="message" class="block text-sm font-medium text-gray-700 mb-1">
              Message <span class="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              v-model="form.message"
              :class="{ 'border-red-500 focus:ring-red-500': validation.hasFieldError('message') }"
              rows="8"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              @blur="validation.touchField('message')"
            ></textarea>
            <p v-if="validation.fieldError('message')" class="mt-1 text-sm text-red-500">
              {{ validation.fieldError('message') }}
            </p>
          </div>

          <button type="submit" class="btn-primary w-full relative" :disabled="loading">
            <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
              <svg
                class="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
            <span :class="{ 'opacity-0': loading }"> Envoyer ma demande </span>
          </button>
        </form>

        <div class="mt-12 text-center">
          <h2 class="text-xl font-semibold text-dark mb-4">Informations de contact</h2>
          <p class="text-text/80">
            Village Vacances Le Rouret<br />
            Route du Rouret<br />
            07120 Grospierres<br />
            France
          </p>
          <p class="mt-4 text-text/80">
            Téléphone: <a href="tel:+33787864358" class="hover:underline">+33 7 87 86 43 58</a
            ><br />
            Email:
            <a href="mailto:dominguez-juan@orange.fr" class="hover:underline"
              >dominguez-juan@orange.fr</a
            >
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
