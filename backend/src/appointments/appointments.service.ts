import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { TreatmentIngredient } from '../treatments/treatment-ingredient.entity';
import { Treatment } from '../treatments/treatment.entity';
import { UserRole, User } from '../users/user.entity';
import { AppointmentPhotosService } from './appointment-photos.service';
import { AppointmentStockLine } from './appointment-stock-line.entity';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { StylistResponseDto } from './dto/stylist-response.dto';
import { StylistSkill } from './stylist-skill.entity';

function formatTerm(value: Date): string {
  const parts = new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('hour')}:${part('minute')}`;
}

export interface AppointmentPage {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectRepository(StylistSkill)
    private readonly skillsRepository: Repository<StylistSkill>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Treatment)
    private readonly treatmentsRepository: Repository<Treatment>,
    private readonly photosService: AppointmentPhotosService,
  ) {}

  async findAll(
    user: User,
    query: ListAppointmentsQueryDto,
  ): Promise<AppointmentPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const qb = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.stylist', 'stylist')
      .leftJoinAndSelect('appointment.treatment', 'treatment')
      .orderBy('appointment.startsAt', 'ASC');

    if (user.role === UserRole.CLIENT) {
      qb.andWhere('appointment.clientId = :userId', { userId: user.id });
    } else if (user.role === UserRole.STYLIST) {
      qb.andWhere('appointment.stylistId = :userId', { userId: user.id });
    }

    const [appointments, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    await this.photosService.attach(appointments);
    return { appointments, total, page, limit };
  }

  async create(client: User, input: {
    stylistId: string;
    treatmentId: string;
    startsAt: string;
  }): Promise<Appointment> {
    if (client.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Wizytę umawia klientka');
    }

    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Nieprawidłowy termin');
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Nie można umówić wizyty w przeszłości');
    }

    return this.dataSource.transaction((manager) =>
      this.book(manager, client.id, input.stylistId, input.treatmentId, startsAt),
    );
  }

  async cancel(user: User, id: string): Promise<Appointment> {
    return this.dataSource.transaction((manager) =>
      this.cancelInTransaction(manager, user, id),
    );
  }

  async listStylists(): Promise<StylistResponseDto[]> {
    const stylists = await this.usersRepository.find({
      where: { role: UserRole.STYLIST },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    if (stylists.length === 0) {
      return [];
    }

    const skills = await this.skillsRepository.find({
      where: { stylistId: In(stylists.map((stylist) => stylist.id)) },
      relations: { treatment: true },
    });

    return stylists.map((stylist) => ({
      id: stylist.id,
      firstName: stylist.firstName,
      lastName: stylist.lastName,
      treatments: skills
        .filter((skill) => skill.stylistId === stylist.id && skill.treatment)
        .map((skill) => ({
          id: skill.treatment.id,
          name: skill.treatment.name,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, 'pl')),
    }));
  }

  async addSkill(stylistId: string, treatmentId: string): Promise<void> {
    const stylist = await this.usersRepository.findOne({
      where: { id: stylistId },
    });
    if (!stylist || stylist.role !== UserRole.STYLIST) {
      throw new NotFoundException('Nie znaleziono stylistki');
    }

    const treatment = await this.treatmentsRepository.findOne({
      where: { id: treatmentId },
    });
    if (!treatment) {
      throw new NotFoundException('Nie znaleziono zabiegu');
    }

    const existing = await this.skillsRepository.findOne({
      where: { stylistId, treatmentId },
    });
    if (existing) {
      throw new ConflictException('Stylistka już wykonuje ten zabieg');
    }

    await this.skillsRepository.save(
      this.skillsRepository.create({ stylistId, treatmentId }),
    );
  }

  async removeSkill(stylistId: string, treatmentId: string): Promise<void> {
    const existing = await this.skillsRepository.findOne({
      where: { stylistId, treatmentId },
    });
    if (!existing) {
      throw new NotFoundException('Nie znaleziono uprawnienia');
    }
    await this.skillsRepository.delete(existing.id);
  }

  private async book(
    manager: EntityManager,
    clientId: string,
    stylistId: string,
    treatmentId: string,
    startsAt: Date,
  ): Promise<Appointment> {
    const stylist = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .setLock('pessimistic_write')
      .where('user.id = :stylistId', { stylistId })
      .getOne();
    if (!stylist || stylist.role !== UserRole.STYLIST) {
      throw new NotFoundException('Nie znaleziono stylistki');
    }

    const treatment = await manager.getRepository(Treatment).findOne({
      where: { id: treatmentId },
      relations: { ingredients: { product: true } },
    });
    if (!treatment) {
      throw new NotFoundException('Nie znaleziono zabiegu');
    }

    const skill = await manager.getRepository(StylistSkill).findOne({
      where: { stylistId, treatmentId },
    });
    if (!skill) {
      throw new ConflictException('Ta stylistka nie wykonuje tego zabiegu');
    }

    const endsAt = new Date(
      startsAt.getTime() + treatment.durationMinutes * 60_000,
    );
    const stylistClash = await this.findClash(
      manager,
      'stylistId',
      stylistId,
      startsAt,
      endsAt,
    );
    if (stylistClash) {
      throw new ConflictException(
        `Stylistka jest zajęta do ${formatTerm(stylistClash.endsAt)}. Wybierz późniejszy termin`,
      );
    }

    const clientClash = await this.findClash(
      manager,
      'clientId',
      clientId,
      startsAt,
      endsAt,
    );
    if (clientClash) {
      throw new ConflictException(
        `Masz już wizytę do ${formatTerm(clientClash.endsAt)}. Wybierz późniejszy termin`,
      );
    }

    await this.takeStock(manager, treatment.ingredients ?? []);

    const saved = await manager.getRepository(Appointment).save(
      manager.getRepository(Appointment).create({
        clientId,
        stylistId,
        treatmentId,
        startsAt,
        endsAt,
        status: AppointmentStatus.BOOKED,
      }),
    );

    const lines = (treatment.ingredients ?? []).map((ingredient) =>
      manager.getRepository(AppointmentStockLine).create({
        appointmentId: saved.id,
        productId: ingredient.productId,
        quantity: ingredient.quantityPerVisit,
      }),
    );
    if (lines.length > 0) {
      await manager.getRepository(AppointmentStockLine).save(lines);
    }

    return this.loadAppointment(manager, saved.id);
  }

  private async cancelInTransaction(
    manager: EntityManager,
    user: User,
    id: string,
  ): Promise<Appointment> {
    const appointment = await manager
      .getRepository(Appointment)
      .createQueryBuilder('appointment')
      .setLock('pessimistic_write')
      .where('appointment.id = :id', { id })
      .getOne();
    if (!appointment) {
      throw new NotFoundException('Nie znaleziono wizyty');
    }

    const canCancel =
      user.role === UserRole.ADMIN ||
      (user.role === UserRole.CLIENT && appointment.clientId === user.id);
    if (!canCancel) {
      throw new ForbiddenException('Brak uprawnień');
    }
    if (appointment.status !== AppointmentStatus.BOOKED) {
      throw new ConflictException('Wizyta jest już odwołana');
    }

    const lines = await manager.getRepository(AppointmentStockLine).find({
      where: { appointmentId: id },
    });
    await this.returnStock(manager, lines);
    appointment.status = AppointmentStatus.CANCELLED;
    await manager.getRepository(Appointment).save(appointment);
    return this.loadAppointment(manager, id);
  }

  private async takeStock(
    manager: EntityManager,
    ingredients: TreatmentIngredient[],
  ): Promise<void> {
    const productIds = [...new Set(ingredients.map((item) => item.productId))].sort();
    if (productIds.length === 0) {
      return;
    }

    const products = await this.lockProducts(manager, productIds);
    const missing = ingredients
      .filter((ingredient) => {
        const product = products.get(ingredient.productId);
        return !product || product.stock < ingredient.quantityPerVisit;
      })
      .map((ingredient) => ingredient.product?.name ?? 'kosmetyk');
    if (missing.length > 0) {
      throw new ConflictException(
        `Brakuje kosmetyków na magazynie: ${missing.join(', ')}`,
      );
    }

    for (const ingredient of ingredients) {
      const product = products.get(ingredient.productId);
      if (!product) {
        continue;
      }
      product.stock -= ingredient.quantityPerVisit;
      await manager.getRepository(Product).save(product);
    }
  }

  private async returnStock(
    manager: EntityManager,
    lines: AppointmentStockLine[],
  ): Promise<void> {
    const productIds = [...new Set(lines.map((line) => line.productId))].sort();
    if (productIds.length === 0) {
      return;
    }

    const products = await this.lockProducts(manager, productIds);
    for (const line of lines) {
      const product = products.get(line.productId);
      if (!product) {
        continue;
      }
      product.stock += line.quantity;
      await manager.getRepository(Product).save(product);
    }
  }

  private async lockProducts(
    manager: EntityManager,
    productIds: string[],
  ): Promise<Map<string, Product>> {
    const products = await manager
      .getRepository(Product)
      .createQueryBuilder('product')
      .setLock('pessimistic_write')
      .where('product.id IN (:...productIds)', { productIds })
      .orderBy('product.id', 'ASC')
      .getMany();
    return new Map(products.map((product) => [product.id, product]));
  }

  private async findClash(
    manager: EntityManager,
    column: 'stylistId' | 'clientId',
    userId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Appointment | null> {
    return manager
      .getRepository(Appointment)
      .createQueryBuilder('appointment')
      .where(`appointment.${column} = :userId`, { userId })
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.BOOKED,
      })
      .andWhere('appointment.startsAt < :endsAt', { endsAt })
      .andWhere('appointment.endsAt > :startsAt', { startsAt })
      .orderBy('appointment.endsAt', 'DESC')
      .getOne();
  }

  private async loadAppointment(
    manager: EntityManager,
    id: string,
  ): Promise<Appointment> {
    const appointment = await manager.getRepository(Appointment).findOne({
      where: { id },
      relations: { client: true, stylist: true, treatment: true, photos: true },
    });
    if (!appointment) {
      throw new NotFoundException('Nie znaleziono wizyty');
    }
    return appointment;
  }
}
