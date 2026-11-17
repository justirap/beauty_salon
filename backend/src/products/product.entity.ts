import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80, unique: true })
  name: string;

  @Column({ type: 'int' })
  stock: number;
}
