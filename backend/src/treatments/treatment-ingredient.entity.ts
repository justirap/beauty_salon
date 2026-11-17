import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product } from '../products/product.entity';
import { Treatment } from './treatment.entity';

@Entity('treatment_ingredients')
@Unique(['treatmentId', 'productId'])
export class TreatmentIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Treatment, (treatment) => treatment.ingredients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'treatment_id' })
  treatment: Treatment;

  @Column({ name: 'treatment_id' })
  treatmentId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'quantity_per_visit', type: 'int' })
  quantityPerVisit: number;
}
