import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { ListTreatmentsQueryDto } from './dto/list-treatments-query.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { TreatmentIngredient } from './treatment-ingredient.entity';
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
    @InjectRepository(TreatmentIngredient)
    private readonly ingredientsRepository: Repository<TreatmentIngredient>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  findById(id: string): Promise<Treatment | null> {
    return this.treatmentsRepository.findOne({
      where: { id },
      relations: { ingredients: { product: true } },
    });
  }

  findByName(name: string): Promise<Treatment | null> {
    return this.treatmentsRepository.findOne({ where: { name } });
  }

  async create(dto: CreateTreatmentDto): Promise<Treatment> {
    const treatment = this.treatmentsRepository.create({
      ...dto,
      price: this.money(dto.price),
    });
    const saved = await this.treatmentsRepository.save(treatment);
    return (await this.findById(saved.id)) ?? saved;
  }

  async findAll(query: ListTreatmentsQueryDto): Promise<TreatmentPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const [pageRows, total] = await this.treatmentsRepository.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    if (pageRows.length === 0) {
      return { treatments: [], total, page, limit };
    }

    const treatments = await this.treatmentsRepository.find({
      where: { id: In(pageRows.map((row) => row.id)) },
      relations: { ingredients: { product: true } },
      order: { name: 'ASC' },
    });
    return { treatments, total, page, limit };
  }

  async update(id: string, dto: UpdateTreatmentDto): Promise<Treatment> {
    const treatment = await this.treatmentsRepository.findOne({
      where: { id },
    });
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

    const saved = await this.treatmentsRepository.save(treatment);
    return (await this.findById(saved.id)) ?? saved;
  }

  async addIngredient(
    treatmentId: string,
    dto: CreateIngredientDto,
  ): Promise<TreatmentIngredient> {
    const treatment = await this.treatmentsRepository.findOne({
      where: { id: treatmentId },
    });
    if (!treatment) {
      throw new NotFoundException('Nie znaleziono zabiegu');
    }

    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Nie znaleziono kosmetyku');
    }

    const existing = await this.ingredientsRepository.findOne({
      where: { treatmentId, productId: dto.productId },
    });
    if (existing) {
      throw new ConflictException('Ten kosmetyk jest już w składzie zabiegu');
    }

    const saved = await this.ingredientsRepository.save(
      this.ingredientsRepository.create({
        treatmentId,
        productId: dto.productId,
        quantityPerVisit: dto.quantityPerVisit,
      }),
    );
    return this.loadIngredient(treatmentId, saved.id);
  }

  async updateIngredient(
    treatmentId: string,
    ingredientId: string,
    dto: UpdateIngredientDto,
  ): Promise<TreatmentIngredient> {
    const ingredient = await this.ingredientsRepository.findOne({
      where: { id: ingredientId, treatmentId },
    });
    if (!ingredient) {
      throw new NotFoundException('Nie znaleziono pozycji składu');
    }

    if (dto.quantityPerVisit !== undefined) {
      ingredient.quantityPerVisit = dto.quantityPerVisit;
    }

    await this.ingredientsRepository.save(ingredient);
    return this.loadIngredient(treatmentId, ingredientId);
  }

  async removeIngredient(
    treatmentId: string,
    ingredientId: string,
  ): Promise<void> {
    const ingredient = await this.ingredientsRepository.findOne({
      where: { id: ingredientId, treatmentId },
    });
    if (!ingredient) {
      throw new NotFoundException('Nie znaleziono pozycji składu');
    }
    await this.ingredientsRepository.delete(ingredientId);
  }

  async remove(id: string): Promise<void> {
    const treatment = await this.findById(id);
    if (!treatment) {
      throw new NotFoundException('Nie znaleziono zabiegu');
    }
    await this.treatmentsRepository.delete(id);
  }

  private async loadIngredient(
    treatmentId: string,
    ingredientId: string,
  ): Promise<TreatmentIngredient> {
    const ingredient = await this.ingredientsRepository.findOne({
      where: { id: ingredientId, treatmentId },
      relations: { product: true },
    });
    if (!ingredient) {
      throw new NotFoundException('Nie znaleziono pozycji składu');
    }
    return ingredient;
  }

  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
