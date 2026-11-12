import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Treatment } from './treatment.entity';
import { TreatmentSeedService } from './treatment-seed.service';
import { TreatmentsController } from './treatments.controller';
import { TreatmentsService } from './treatments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Treatment]), AuthModule],
  controllers: [TreatmentsController],
  providers: [TreatmentsService, TreatmentSeedService],
})
export class TreatmentsModule {}
