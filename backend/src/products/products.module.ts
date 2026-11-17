import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TreatmentIngredient } from '../treatments/treatment-ingredient.entity';
import { Treatment } from '../treatments/treatment.entity';
import { TreatmentsModule } from '../treatments/treatments.module';
import { ProductSeedService } from './product-seed.service';
import { Product } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Treatment, TreatmentIngredient]),
    AuthModule,
    TreatmentsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductSeedService],
})
export class ProductsModule {}
