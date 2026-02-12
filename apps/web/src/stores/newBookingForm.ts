import { defineStore } from 'pinia';
import { pricingApi, type PriceDetail } from '../lib/api';
import { OPTION_PRICES, PAYMENT_PERCENTAGES, getFallbackPricePerNight } from '../constants/pricing';
import {
  required,
  email as emailRule,
  postalCode as postalCodeRule,
  validate,
} from '../utils/validation';

export interface ClientFormData {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
}

export interface NewBookingFormState {
  // Etape 1 : Dates
  startDate: string;
  endDate: string;

  // Etape 2 : Client
  primaryClient: ClientFormData;
  hasSecondaryClient: boolean;
  secondaryClient: ClientFormData;

  // Etape 3 : Occupants
  occupantsCount: number;
  adultsCount: number;

  // Etape 4 : Options
  cleaningIncluded: boolean;
  linenIncluded: boolean;

  // Etape 5 : Tarif
  rentalPrice: number;
  pricePerNight: number;
  priceDetails: PriceDetail[];
  hasUncoveredDays: boolean;
  uncoveredDays: number;
  priceCalculationError: string | null;
  isCalculatingPrice: boolean;

  // Contraintes dynamiques
  minNightsRequired: number;
  isWeeklyRate: boolean;

  // Navigation
  currentStep: number;
}

const createEmptyClient = (): ClientFormData => ({
  firstName: '',
  lastName: '',
  address: '',
  postalCode: '',
  city: '',
  country: 'France',
  phone: '',
  email: '',
});

const getInitialState = (): NewBookingFormState => ({
  startDate: '',
  endDate: '',
  primaryClient: createEmptyClient(),
  hasSecondaryClient: false,
  secondaryClient: createEmptyClient(),
  occupantsCount: 1,
  adultsCount: 1,
  cleaningIncluded: true,
  linenIncluded: true,
  rentalPrice: 0,
  pricePerNight: 0,
  priceDetails: [],
  hasUncoveredDays: false,
  uncoveredDays: 0,
  priceCalculationError: null,
  isCalculatingPrice: false,
  minNightsRequired: 3,
  isWeeklyRate: false,
  currentStep: 1,
});

export const useNewBookingFormStore = defineStore('newBookingForm', {
  state: (): NewBookingFormState => getInitialState(),

  getters: {
    nightsCount(): number {
      if (!this.startDate || !this.endDate) return 0;
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    cleaningPrice(): number {
      return this.cleaningIncluded ? OPTION_PRICES.CLEANING : 0;
    },

    linenPrice(): number {
      return this.linenIncluded ? OPTION_PRICES.LINEN_PER_PERSON * this.occupantsCount : 0;
    },

    touristTaxPrice(): number {
      return OPTION_PRICES.TOURIST_TAX_PER_ADULT_PER_NIGHT * this.adultsCount * this.nightsCount;
    },

    totalPrice(): number {
      return this.rentalPrice + this.cleaningPrice + this.linenPrice + this.touristTaxPrice;
    },

    depositAmount(): number {
      return Math.round(this.totalPrice * PAYMENT_PERCENTAGES.DEPOSIT);
    },

    balanceAmount(): number {
      return this.totalPrice - this.depositAmount;
    },

    clientFullName(): string {
      const primary = `${this.primaryClient.firstName} ${this.primaryClient.lastName}`.trim();
      if (this.hasSecondaryClient && this.secondaryClient.firstName) {
        const secondary =
          `${this.secondaryClient.firstName} ${this.secondaryClient.lastName}`.trim();
        return `${primary} et ${secondary}`;
      }
      return primary;
    },

    isStep1Valid(): boolean {
      if (!this.startDate || !this.endDate) return false;
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return start >= today && end > start && this.nightsCount >= this.minNightsRequired;
    },

    minNightsError(): string | null {
      if (!this.startDate || !this.endDate) return null;
      if (this.nightsCount < this.minNightsRequired) {
        return `Cette période nécessite un minimum de ${String(this.minNightsRequired)} nuits`;
      }
      return null;
    },

    weeklyRateLabel(): string | null {
      if (!this.isWeeklyRate) return null;
      return 'Tarif semaine appliqué (7+ nuits)';
    },

    isStep2Valid(): boolean {
      const p = this.primaryClient;
      const fields: (keyof ClientFormData)[] = [
        'firstName',
        'lastName',
        'address',
        'postalCode',
        'city',
        'phone',
        'email',
      ];

      for (const field of fields) {
        if (validate(p[field], [required()]) !== null) return false;
      }

      if (validate(p.email, [emailRule()]) !== null) return false;
      if (validate(p.postalCode, [postalCodeRule()]) !== null) return false;

      return true;
    },

    isStep3Valid(): boolean {
      return (
        this.occupantsCount >= 1 &&
        this.occupantsCount <= 6 &&
        this.adultsCount >= 1 &&
        this.adultsCount <= this.occupantsCount
      );
    },

    isStep4Valid(): boolean {
      return true; // Options are optional
    },

    isStep5Valid(): boolean {
      return this.rentalPrice > 0;
    },

    canProceed(): boolean {
      switch (this.currentStep) {
        case 1:
          return this.isStep1Valid;
        case 2:
          return this.isStep2Valid;
        case 3:
          return this.isStep3Valid;
        case 4:
          return this.isStep4Valid;
        case 5:
          return this.isStep5Valid;
        default:
          return true;
      }
    },
  },

  actions: {
    nextStep(): void {
      if (this.currentStep < 6 && this.canProceed) {
        this.currentStep++;
      }
    },

    prevStep(): void {
      if (this.currentStep > 1) {
        this.currentStep--;
      }
    },

    goToStep(step: number): void {
      if (step >= 1 && step <= 6) {
        this.currentStep = step;
      }
    },

    setDates(startDate: string, endDate: string): void {
      this.startDate = startDate;
      this.endDate = endDate;
    },

    setPrimaryClient(client: Partial<ClientFormData>): void {
      this.primaryClient = { ...this.primaryClient, ...client };
    },

    setSecondaryClient(client: Partial<ClientFormData>): void {
      this.secondaryClient = { ...this.secondaryClient, ...client };
    },

    async calculateSuggestedPrice(): Promise<void> {
      if (!this.startDate || !this.endDate) return;

      this.isCalculatingPrice = true;
      this.priceCalculationError = null;

      try {
        const result = await pricingApi.calculate(this.startDate, this.endDate);

        this.rentalPrice = result.totalPrice;
        this.priceDetails = result.details;
        this.hasUncoveredDays = result.hasUncoveredDays;
        this.uncoveredDays = result.uncoveredDays;
        this.minNightsRequired = result.minNightsRequired;
        this.isWeeklyRate = result.isWeeklyRate;

        // Calculer le prix moyen par nuit pour l'affichage
        if (result.totalNights > 0) {
          this.pricePerNight = Math.round(result.totalPrice / result.totalNights);
        }
      } catch {
        // Fallback: calcul local si l'API n'est pas disponible
        this.priceCalculationError = 'Calcul automatique indisponible';
        this.calculateFallbackPrice();
      } finally {
        this.isCalculatingPrice = false;
      }
    },

    calculateFallbackPrice(): void {
      if (!this.startDate) return;

      const start = new Date(this.startDate);
      const month = start.getMonth() + 1;

      const pricePerNight = getFallbackPricePerNight(month);

      this.pricePerNight = pricePerNight;
      this.rentalPrice = pricePerNight * this.nightsCount;
      this.priceDetails = [];
      this.hasUncoveredDays = false;
      this.uncoveredDays = 0;
    },

    reset(): void {
      const initial = getInitialState();
      this.startDate = initial.startDate;
      this.endDate = initial.endDate;
      this.primaryClient = initial.primaryClient;
      this.hasSecondaryClient = initial.hasSecondaryClient;
      this.secondaryClient = initial.secondaryClient;
      this.occupantsCount = initial.occupantsCount;
      this.adultsCount = initial.adultsCount;
      this.cleaningIncluded = initial.cleaningIncluded;
      this.linenIncluded = initial.linenIncluded;
      this.rentalPrice = initial.rentalPrice;
      this.pricePerNight = initial.pricePerNight;
      this.priceDetails = initial.priceDetails;
      this.hasUncoveredDays = initial.hasUncoveredDays;
      this.uncoveredDays = initial.uncoveredDays;
      this.priceCalculationError = initial.priceCalculationError;
      this.isCalculatingPrice = initial.isCalculatingPrice;
      this.minNightsRequired = initial.minNightsRequired;
      this.isWeeklyRate = initial.isWeeklyRate;
      this.currentStep = initial.currentStep;
    },

    getBookingData(): {
      startDate: string;
      endDate: string;
      primaryClient: Omit<ClientFormData, 'email'> & { email?: string };
      secondaryClient?: Omit<ClientFormData, 'email'> & { email?: string };
      occupantsCount: number;
      adultsCount: number;
      rentalPrice: number;
      touristTaxIncluded: boolean;
      cleaningIncluded: boolean;
      linenIncluded: boolean;
    } {
      const data: ReturnType<typeof this.getBookingData> = {
        startDate: this.startDate,
        endDate: this.endDate,
        primaryClient: {
          firstName: this.primaryClient.firstName,
          lastName: this.primaryClient.lastName,
          address: this.primaryClient.address,
          postalCode: this.primaryClient.postalCode,
          city: this.primaryClient.city,
          country: this.primaryClient.country,
          phone: this.primaryClient.phone,
          ...(this.primaryClient.email ? { email: this.primaryClient.email } : {}),
        },
        occupantsCount: this.occupantsCount,
        adultsCount: this.adultsCount,
        rentalPrice: this.rentalPrice,
        touristTaxIncluded: true,
        cleaningIncluded: this.cleaningIncluded,
        linenIncluded: this.linenIncluded,
      };

      if (this.hasSecondaryClient && this.secondaryClient.firstName) {
        data.secondaryClient = {
          firstName: this.secondaryClient.firstName,
          lastName: this.secondaryClient.lastName,
          address: this.secondaryClient.address || this.primaryClient.address,
          postalCode: this.secondaryClient.postalCode || this.primaryClient.postalCode,
          city: this.secondaryClient.city || this.primaryClient.city,
          country: this.secondaryClient.country || this.primaryClient.country,
          phone: this.secondaryClient.phone || this.primaryClient.phone,
          ...(this.secondaryClient.email ? { email: this.secondaryClient.email } : {}),
        };
      }

      return data;
    },
  },
});
