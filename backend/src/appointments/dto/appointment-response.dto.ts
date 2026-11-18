import { ApiProperty } from '@nestjs/swagger';
import { Appointment, AppointmentStatus } from '../appointment.entity';

export class AppointmentPersonDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class AppointmentTreatmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  price: number;
}

export class AppointmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  startsAt: string;

  @ApiProperty()
  endsAt: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiProperty({ type: AppointmentPersonDto })
  client: AppointmentPersonDto;

  @ApiProperty({ type: AppointmentPersonDto })
  stylist: AppointmentPersonDto;

  @ApiProperty({ type: AppointmentTreatmentDto })
  treatment: AppointmentTreatmentDto;
}

function toPerson(person: {
  id: string;
  firstName: string;
  lastName: string;
}): AppointmentPersonDto {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
  };
}

export function toAppointmentResponse(
  appointment: Appointment,
): AppointmentResponseDto {
  return {
    id: appointment.id,
    startsAt: new Date(appointment.startsAt).toISOString(),
    endsAt: new Date(appointment.endsAt).toISOString(),
    status: appointment.status,
    client: toPerson(appointment.client),
    stylist: toPerson(appointment.stylist),
    treatment: {
      id: appointment.treatment.id,
      name: appointment.treatment.name,
      durationMinutes: appointment.treatment.durationMinutes,
      price: Number(appointment.treatment.price),
    },
  };
}
