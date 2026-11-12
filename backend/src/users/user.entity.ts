import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  CLIENT = 'CLIENT',
  STYLIST = 'STYLIST',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', length: 60 })
  firstName: string;

  @Column({ name: 'last_name', length: 60 })
  lastName: string;

  @Column({ length: 254, unique: true })
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;
}
