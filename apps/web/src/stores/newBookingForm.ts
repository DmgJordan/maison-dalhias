import { defineStore } from 'pinia';

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
      return this.cleaningIncluded ? 80 : 0;
    },

    linenPrice(): number {
      return this.linenIncluded ? 15 * this.occupantsCount : 0;
    },

    touristTaxPrice(): number {
      return 1 * this.adultsCount * this.nightsCount;
    },

    totalPrice(): number {
      return this.rentalPrice + this.cleaningPrice + this.linenPrice + this.touristTaxPrice;
    },

    depositAmount(): number {
      return Math.round(this.totalPrice * 0.3);
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
      return start >= today && end > start && this.nightsCount >= 3;
    },

    isStep2Valid(): boolean {
      const p = this.primaryClient;
      const hasRequired =
        p.firstName.trim() !== '' &&
        p.lastName.trim() !== '' &&
        p.address.trim() !== '' &&
        p.postalCode.trim() !== '' &&
        p.city.trim() !== '' &&
        p.phone.trim() !== '' &&
        p.email.trim() !== '';

      if (!hasRequired) return false;

      // Validation email basique
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(p.email)) return false;

      // Validation code postal (5 chiffres)
      const postalRegex = /^\d{5}$/;
      if (!postalRegex.test(p.postalCode)) return false;

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

    calculateSuggestedPrice(): void {
      if (!this.startDate) return;

      const start = new Date(this.startDate);
      const month = start.getMonth() + 1;

      // Tarifs selon la periode
      let pricePerNight = 80; // Basse saison par defaut

      if (month >= 7 && month <= 8) {
        pricePerNight = 180; // Juillet-Aout
      } else if (month >= 4 && month <= 6) {
        pricePerNight = 120; // Avril-Juin
      } else if (month === 9 || month === 10) {
        pricePerNight = 100; // Septembre-Octobre
      }

      this.pricePerNight = pricePerNight;
      this.rentalPrice = pricePerNight * this.nightsCount;
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
      this.currentStep = initial.currentStep;
    },

    getBookingData(): {
      startDate: string;
      endDate: string;
      primaryClient: Omit<ClientFormData, 'email'> & { email?: string };
      secondaryClient?: Omit<ClientFormData, 'email'> & { email?: string };
      occupantsCount: number;
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
        },
        occupantsCount: this.occupantsCount,
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
        };
      }

      return data;
    },
  },
});
