import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { ListTreatmentsQueryDto } from './dto/list-treatments-query.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { Treatment } from './treatment.entity';

export interface TreatmentPage {
  treatments: Treatment[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class TreatmentsService {
  constructor(
    @InjectRepository(Treatment)
    private readonly treatmentsRepository: Repository<Treatment>,
  ) {}

  findById(id: string): Promise<Treatment | null> {
    return this.treatmentsRepository.findOne({ where: { id } });
  }

  findByName(name: string): Promise<Treatment | null> {
    return this.treatmentsRepository.findOne({ where: { name } });
  }

  create(dto: CreateTreatmentDto): Promise<Treatment> {
    const treatment = this.treatmentsRepository.create({
      ...dto,
      price: this.money(dto.price),
    });
    return this.treatmentsRepository.save(treatment);
  }

  async findAll(query: ListTreatmentsQueryDto): Promise<TreatmentPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const [treatments, total] = await this.treatmentsRepository
      .createQueryBuilder('treatment')
      .orderBy('treatment.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { treatments, total, page, limit };
  }

  async update(id: string, dto: UpdateTreatmentDto): Promise<Treatment> {
    const treatment = await this.findById(id);
    if (!treatment) {
      throw new NotFoundException('Nie znaleziono zabiegu');
    }

    if (dto.name !== undefined) {
      treatment.name = dto.name;
    }
    if (dto.description !== undefined) {
      treatment.description = dto.description;
    }
    if (dto.durationMinutes !== undefined) {
      treatment.durationMinutes = dto.durationMinutes;
    }
    if (dto.price !== undefined) {
      treatment.price = this.money(dto.price);
    }

    return this.treatmentsRepository.save(treatment);
  }

  async remove(id: string): Promise<void> {
    const treatment = await this.findById(id);
    if (!treatment) {
      throw new NotFoundException('Nie znaleziono zabiegu');
    }
    await this.treatmentsRepository.delete(id);
  }

  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
