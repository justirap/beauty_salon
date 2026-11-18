import { IsDateString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  stylistId: string;

  @IsUUID()
  treatmentId: string;

  @IsDateString()
  startsAt: string;
}
