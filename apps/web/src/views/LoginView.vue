<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from '../lib/api';
import { useRouter } from 'vue-router';
import { required, email as emailRule } from '../utils/validation';
import { useFormValidation } from '../composables/useFormValidation';

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const form = ref({ email: '', password: '' });

const validation = useFormValidation({
  schema: {
    email: [required("L'email est obligatoire"), emailRule()],
    password: [required('Le mot de passe est obligatoire')],
  },
  formData: form,
});

const handleLogin = async (): Promise<void> => {
  if (!validation.attemptSubmit()) return;

  try {
    loading.value = true;
    error.value = null;
    await authApi.login(form.value.email, form.value.password);
    router.push('/admin');
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message;
    } else {
      error.value = 'Email ou mot de passe incorrect';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Connexion Administration
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg">
          {{ error }}
        </div>

        <div class="rounded-md shadow-sm">
          <div>
            <label for="email-address" class="sr-only">Adresse email</label>
            <input
              id="email-address"
              v-model="form.email"
              name="email"
              type="email"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
              :class="validation.hasFieldError('email') ? 'border-red-500' : 'border-gray-300'"
              placeholder="Adresse email"
              :aria-invalid="validation.hasFieldError('email') ? 'true' : undefined"
              :aria-describedby="
                validation.hasFieldError('email') ? validation.errorId('email') : undefined
              "
              @blur="validation.touchField('email')"
            />
            <p
              v-if="validation.fieldError('email')"
              :id="validation.errorId('email')"
              class="mt-1 text-sm text-red-500"
              role="alert"
            >
              {{ validation.fieldError('email') }}
            </p>
          </div>
          <div>
            <label for="password" class="sr-only">Mot de passe</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              type="password"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
              :class="validation.hasFieldError('password') ? 'border-red-500' : 'border-gray-300'"
              placeholder="Mot de passe"
              :aria-invalid="validation.hasFieldError('password') ? 'true' : undefined"
              :aria-describedby="
                validation.hasFieldError('password') ? validation.errorId('password') : undefined
              "
              @blur="validation.touchField('password')"
            />
            <p
              v-if="validation.fieldError('password')"
              :id="validation.errorId('password')"
              class="mt-1 text-sm text-red-500"
              role="alert"
            >
              {{ validation.fieldError('password') }}
            </p>
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            :disabled="loading"
          >
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
