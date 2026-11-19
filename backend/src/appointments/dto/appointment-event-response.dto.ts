import { ApiProperty } from '@nestjs/swagger';
import { AppointmentEvent } from '../appointment-event.entity';

export class AppointmentEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  createdAt: string;
}

export class AppointmentEventListResponseDto {
  @ApiProperty({ type: [AppointmentEventResponseDto] })
  data: AppointmentEventResponseDto[];
}

export function toAppointmentEventResponse(
  event: AppointmentEvent,
): AppointmentEventResponseDto {
  return {
    id: event.id,
    message: event.message,
    createdAt: event.createdAt.toISOString(),
  };
}
