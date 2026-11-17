import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreatmentIngredient } from '../treatments/treatment-ingredient.entity';
import { Treatment } from '../treatments/treatment.entity';
import { ProductsService } from './products.service';

const BASE_PRODUCTS: Array<{ name: string; stock: number }> = [
  { name: 'Klej do laminacji', stock: 24 },
  { name: 'Serum do brwi', stock: 18 },
  { name: 'Henna', stock: 30 },
  { name: 'Lakier hybrydowy', stock: 40 },
  { name: 'Oliwka do skórek', stock: 25 },
  { name: 'Serum do twarzy', stock: 16 },
  { name: 'Peeling do stóp', stock: 12 },
  { name: 'Lakier do paznokci', stock: 20 },
  { name: 'Wosk do brwi', stock: 15 },
];

const BASE_RECIPES: Array<{
  treatment: string;
  product: string;
  quantityPerVisit: number;
}> = [
  {
    treatment: 'Laminacja brwi',
    product: 'Klej do laminacji',
    quantityPerVisit: 1,
  },
  {
    treatment: 'Laminacja brwi',
    product: 'Serum do brwi',
    quantityPerVisit: 1,
  },
  { treatment: 'Henna brwi', product: 'Henna', quantityPerVisit: 1 },
  {
    treatment: 'Manicure hybrydowy',
    product: 'Lakier hybrydowy',
    quantityPerVisit: 1,
  },
  {
    treatment: 'Manicure hybrydowy',
    product: 'Oliwka do skórek',
    quantityPerVisit: 1,
  },
  {
    treatment: 'Masaż twarzy',
    product: 'Serum do twarzy',
    quantityPerVisit: 1,
  },
  {
    treatment: 'Pedicure kosmetyczny',
    product: 'Peeling do stóp',
    quantityPerVisit: 1,
  },
  {
    treatment: 'Pedicure kosmetyczny',
    product: 'Lakier do paznokci',
    quantityPerVisit: 1,
  },
  { treatment: 'Regulacja brwi', product: 'Wosk do brwi', quantityPerVisit: 1 },
];

@Injectable()
export class ProductSeedService implements OnModuleInit {
  private readonly logger = new Logger(ProductSeedService.name);

  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(Treatment)
    private readonly treatmentsRepository: Repository<Treatment>,
    @InjectRepository(TreatmentIngredient)
    private readonly ingredientsRepository: Repository<TreatmentIngredient>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const product of BASE_PRODUCTS) {
      const existing = await this.productsService.findByName(product.name);
      if (existing) {
        continue;
      }

      await this.productsService.create(product);
      this.logger.log(`Utworzono kosmetyk ${product.name}`);
    }

    for (const recipe of BASE_RECIPES) {
      const treatment = await this.treatmentsRepository.findOne({
        where: { name: recipe.treatment },
      });
      const product = await this.productsService.findByName(recipe.product);
      if (!treatment || !product) {
        continue;
      }

      const existing = await this.ingredientsRepository.findOne({
        where: { treatmentId: treatment.id, productId: product.id },
      });
      if (existing) {
        continue;
      }

      await this.ingredientsRepository.save(
        this.ingredientsRepository.create({
          treatmentId: treatment.id,
          productId: product.id,
          quantityPerVisit: recipe.quantityPerVisit,
        }),
      );
      this.logger.log(
        `Przypisano ${product.name} do zabiegu ${treatment.name}`,
      );
    }
  }
}
