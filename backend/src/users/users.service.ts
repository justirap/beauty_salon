import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, User } from './user.entity';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface UserPage {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  countByRole(role: UserRole): Promise<number> {
    return this.usersRepository.count({ where: { role } });
  }

  create(input: CreateUserInput): Promise<User> {
    const user = this.usersRepository.create(input);
    return this.usersRepository.save(user);
  }

  async createAccount(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Konto z tym adresem e-mail już istnieje');
    }

    return this.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
    });
  }

  async findAll(query: ListUsersQueryDto): Promise<UserPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [users, total] = await qb.getManyAndCount();
    return { users, total, page, limit };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Nie znaleziono konta');
    }

    if (
      dto.role &&
      dto.role !== UserRole.ADMIN &&
      user.role === UserRole.ADMIN
    ) {
      await this.assertAnotherAdminRemains();
    }

    if (dto.firstName) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName) {
      user.lastName = dto.lastName;
    }
    if (dto.role) {
      user.role = dto.role;
    }

    return this.usersRepository.save(user);
  }

  async remove(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new BadRequestException('Nie możesz usunąć własnego konta');
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Nie znaleziono konta');
    }

    if (user.role === UserRole.ADMIN) {
      await this.assertAnotherAdminRemains();
    }

    await this.usersRepository.delete(id);
  }

  private async assertAnotherAdminRemains(): Promise<void> {
    const admins = await this.countByRole(UserRole.ADMIN);
    if (admins <= 1) {
      throw new BadRequestException(
        'Musi zostać przynajmniej jedna właścicielka',
      );
    }
  }
}
