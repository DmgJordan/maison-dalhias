import { defineStore } from 'pinia';
import type { BookingSource } from '../lib/api';
import { SOURCE_LABELS } from '../constants/booking';

export { SOURCE_LABELS };

export interface QuickBookingFormState {
  // Step 1: Dates & Source
  currentStep: number;
  source: BookingSource | '';
  sourceCustomName: string;
  startDate: string;
  endDate: string;

  // Step 2: Optional details
  label: string;
  externalAmount: number | null;
  occupantsCount: number | null;
  adultsCount: number;
  notes: string;
}

const getInitialState = (): QuickBookingFormState => ({
  currentStep: 1,
  source: '',
  sourceCustomName: '',
  startDate: '',
  endDate: '',
  label: '',
  externalAmount: null,
  occupantsCount: null,
  adultsCount: 1,
  notes: '',
});

export const useQuickBookingFormStore = defineStore('quickBookingForm', {
  state: (): QuickBookingFormState => getInitialState(),

  getters: {
    nightsCount(): number {
      if (!this.startDate || !this.endDate) return 0;
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = end.getTime() - start.getTime();
      if (diffTime <= 0) return 0;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    isStep1Valid(): boolean {
      if (!this.startDate || !this.endDate) return false;
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (end <= start) return false;
      if (!this.source) return false;
      if (this.source === 'OTHER' && !this.sourceCustomName.trim()) return false;
      return true;
    },

    sourceDisplayName(): string {
      if (!this.source) return '';
      if (this.source === 'OTHER' && this.sourceCustomName.trim()) {
        return this.sourceCustomName.trim();
      }
      return SOURCE_LABELS[this.source];
    },
  },
});
