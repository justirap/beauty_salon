import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Product } from '../products/product.entity';
import { TreatmentIngredient } from '../treatments/treatment-ingredient.entity';
import { Treatment } from '../treatments/treatment.entity';
import { TreatmentsModule } from '../treatments/treatments.module';
import { User } from '../users/user.entity';
import { AppointmentEvent } from './appointment-event.entity';
import { AppointmentEventsService } from './appointment-events.service';
import { AppointmentHistoryListener } from './appointment-history.listener';
import { AppointmentPhoto } from './appointment-photo.entity';
import { AppointmentPhotosService } from './appointment-photos.service';
import { AppointmentSeedService } from './appointment-seed.service';
import { AppointmentStockLine } from './appointment-stock-line.entity';
import { Appointment } from './appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { StylistSkill } from './stylist-skill.entity';
import { StylistsController } from './stylists.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentEvent,
      AppointmentPhoto,
      AppointmentStockLine,
      StylistSkill,
      User,
      Treatment,
      TreatmentIngredient,
      Product,
    ]),
    AuthModule,
    TreatmentsModule,
  ],
  controllers: [AppointmentsController, StylistsController],
  providers: [
    AppointmentsService,
    AppointmentSeedService,
    AppointmentPhotosService,
    AppointmentEventsService,
    AppointmentHistoryListener,
  ],
})
export class AppointmentsModule {}
