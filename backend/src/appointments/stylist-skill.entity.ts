import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Treatment } from '../treatments/treatment.entity';
import { User } from '../users/user.entity';

@Entity('stylist_skills')
@Unique(['stylistId', 'treatmentId'])
export class StylistSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stylist_id' })
  stylist: User;

  @Column({ name: 'stylist_id' })
  stylistId: string;

  @ManyToOne(() => Treatment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'treatment_id' })
  treatment: Treatment;

  @Column({ name: 'treatment_id' })
  treatmentId: string;
}
