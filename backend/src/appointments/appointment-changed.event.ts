export const APPOINTMENT_CHANGED = 'appointment.changed';

export class AppointmentChangedEvent {
  constructor(
    readonly appointmentId: string,
    readonly clientName: string,
    readonly treatmentName: string,
    readonly startsAt: Date,
    readonly kind: 'booked' | 'cancelled',
    readonly cancelledByAdmin: boolean,
  ) {}
}
