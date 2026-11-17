import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { TreatmentsModule } from './treatments/treatments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    AuthModule,
    TreatmentsModule,
    ProductsModule,
  ],
})
export class AppModule {}
