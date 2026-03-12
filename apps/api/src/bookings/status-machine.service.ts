import { Injectable, BadRequestException } from '@nestjs/common';
import { Status, BookingType } from '@prisma/client';

interface TransitionConfig {
  allowedTransitions: Map<Status, Status[]>;
}

@Injectable()
export class StatusMachineService {
  private readonly configs: Record<BookingType, TransitionConfig> = {
    DIRECT: {
      allowedTransitions: new Map<Status, Status[]>([
        [Status.DRAFT, [Status.VALIDATED, Status.CANCELLED]],
        [Status.VALIDATED, [Status.CONTRACT_SENT, Status.FULLY_PAID, Status.CANCELLED]],
        [Status.CONTRACT_SENT, [Status.DEPOSIT_PAID, Status.FULLY_PAID, Status.CANCELLED]],
        [Status.DEPOSIT_PAID, [Status.FULLY_PAID, Status.CANCELLED]],
        [Status.FULLY_PAID, [Status.CANCELLED]],
      ]),
    },
    EXTERNAL: {
      allowedTransitions: new Map<Status, Status[]>([
        [Status.DRAFT, [Status.VALIDATED, Status.CANCELLED]],
        [Status.VALIDATED, [Status.CANCELLED]],
      ]),
    },
    PERSONAL: {
      allowedTransitions: new Map<Status, Status[]>([
        [Status.DRAFT, [Status.VALIDATED, Status.CANCELLED]],
        [Status.VALIDATED, [Status.CANCELLED]],
      ]),
    },
  };

  getAvailableTransitions(currentStatus: Status, bookingType: BookingType): Status[] {
    const config = this.configs[bookingType];
    return config.allowedTransitions.get(currentStatus) ?? [];
  }

  validateTransition(
    currentStatus: Status,
    targetStatus: Status,
    bookingType: BookingType,
  ): void {
    if (currentStatus === Status.CANCELLED) {
      throw new BadRequestException('Impossible de changer le statut d\'une réservation annulée');
    }

    const allowed = this.getAvailableTransitions(currentStatus, bookingType);
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Transition non autorisée : ${currentStatus} → ${targetStatus} pour le type ${bookingType}`,
      );
    }
  }

  getSteps(bookingType: BookingType): Status[] {
    if (bookingType === 'DIRECT') {
      return [Status.DRAFT, Status.VALIDATED, Status.CONTRACT_SENT, Status.DEPOSIT_PAID, Status.FULLY_PAID];
    }
    return [Status.DRAFT, Status.VALIDATED];
  }
}
