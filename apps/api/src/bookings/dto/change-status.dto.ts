import { IsEnum } from 'class-validator';
import { Status } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(Status)
  status: Status;
}
