import {
  IsDateString,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
class IsEndDateAfterStartDate implements ValidatorConstraintInterface {
  validate(_value: string, args: ValidationArguments): boolean {
    const obj = args.object as CalculatePriceDto;
    if (!obj.startDate || !obj.endDate) return true;
    return new Date(obj.endDate) > new Date(obj.startDate);
  }

  defaultMessage(): string {
    return 'La date de fin doit être postérieure à la date de début';
  }
}

export class CalculatePriceDto {
  @IsDateString(
    { strict: true },
    { message: 'La date de début doit être au format ISO (YYYY-MM-DD)' }
  )
  startDate: string;

  @IsDateString(
    { strict: true },
    { message: 'La date de fin doit être au format ISO (YYYY-MM-DD)' }
  )
  @Validate(IsEndDateAfterStartDate)
  endDate: string;
}
