import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Product } from '../products/product.entity';
import { TreatmentIngredient } from './treatment-ingredient.entity';
import { Treatment } from './treatment.entity';
import { TreatmentSeedService } from './treatment-seed.service';
import { TreatmentsController } from './treatments.controller';
import { TreatmentsService } from './treatments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Treatment, TreatmentIngredient, Product]),
    AuthModule,
  ],
  controllers: [TreatmentsController],
  providers: [TreatmentsService, TreatmentSeedService],
})
export class TreatmentsModule {}
