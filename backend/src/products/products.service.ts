import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isForeignKeyError } from '../common/is-foreign-key-error';
import { TreatmentIngredient } from '../treatments/treatment-ingredient.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.entity';

export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(TreatmentIngredient)
    private readonly ingredientsRepository: Repository<TreatmentIngredient>,
  ) {}

  findById(id: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { id } });
  }

  findByName(name: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { name } });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Kosmetyk o tej nazwie już istnieje');
    }

    const product = this.productsRepository.create(dto);
    return this.productsRepository.save(product);
  }

  async findAll(query: ListProductsQueryDto): Promise<ProductPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const [products, total] = await this.productsRepository
      .createQueryBuilder('product')
      .orderBy('product.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { products, total, page, limit };
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('Nie znaleziono kosmetyku');
    }

    if (dto.name !== undefined && dto.name !== product.name) {
      const existing = await this.findByName(dto.name);
      if (existing) {
        throw new ConflictException('Kosmetyk o tej nazwie już istnieje');
      }
      product.name = dto.name;
    }
    if (dto.stock !== undefined) {
      product.stock = dto.stock;
    }

    return this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('Nie znaleziono kosmetyku');
    }

    const used = await this.ingredientsRepository.count({
      where: { productId: id },
    });
    if (used > 0) {
      throw new ConflictException('Kosmetyk jest przypisany do zabiegu');
    }

    try {
      await this.productsRepository.delete(id);
    } catch (error) {
      if (isForeignKeyError(error)) {
        throw new ConflictException('Kosmetyk jest używany przy wizycie');
      }
      throw error;
    }
  }
}
