import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  APPOINTMENT_CHANGED,
  AppointmentChangedEvent,
} from './appointment-changed.event';
import { AppointmentEvent } from './appointment-event.entity';
import { formatTerm } from './format-term';

@Injectable()
export class AppointmentHistoryListener {
  constructor(
    @InjectRepository(AppointmentEvent)
    private readonly eventsRepository: Repository<AppointmentEvent>,
  ) {}

  @OnEvent(APPOINTMENT_CHANGED)
  async record(event: AppointmentChangedEvent): Promise<void> {
    const term = formatTerm(new Date(event.startsAt));
    const message =
      event.kind === 'booked'
        ? `${event.clientName} umówiła wizytę ${event.treatmentName} na ${term}.`
        : event.cancelledByAdmin
          ? `Właścicielka odwołała wizytę klientki ${event.clientName}: ${event.treatmentName}, ${term}.`
          : `${event.clientName} odwołała wizytę ${event.treatmentName} na ${term}.`;

    await this.eventsRepository.save(
      this.eventsRepository.create({
        appointmentId: event.appointmentId,
        message,
      }),
    );
  }
}
