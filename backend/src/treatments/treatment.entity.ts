import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TreatmentIngredient } from './treatment-ingredient.entity';

@Entity('treatments')
export class Treatment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => TreatmentIngredient, (ingredient) => ingredient.treatment)
  ingredients: TreatmentIngredient[];

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  price: number;
}
