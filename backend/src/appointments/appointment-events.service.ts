import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole, User } from '../users/user.entity';
import { AppointmentEvent } from './appointment-event.entity';

@Injectable()
export class AppointmentEventsService {
  constructor(
    @InjectRepository(AppointmentEvent)
    private readonly eventsRepository: Repository<AppointmentEvent>,
  ) {}

  async list(user: User): Promise<AppointmentEvent[]> {
    if (user.role === UserRole.CLIENT) {
      throw new ForbiddenException('Brak uprawnień');
    }

    const query = this.eventsRepository
      .createQueryBuilder('event')
      .innerJoin('event.appointment', 'appointment')
      .orderBy('event.createdAt', 'DESC')
      .take(30);

    if (user.role === UserRole.STYLIST) {
      query.andWhere('appointment.stylistId = :stylistId', {
        stylistId: user.id,
      });
    }

    return query.getMany();
  }
}
