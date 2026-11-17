import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ListProductsQueryDto,
  ProductListResponseDto,
} from './dto/list-products-query.dto';
import {
  ProductResponseDto,
  toProductResponse,
} from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOkResponse({ type: ProductListResponseDto })
  async list(
    @Query() query: ListProductsQueryDto,
  ): Promise<ProductListResponseDto> {
    const result = await this.productsService.findAll(query);
    return {
      data: result.products.map((product) => toProductResponse(product)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException('Nie znaleziono kosmetyku');
    }
    return toProductResponse(product);
  }

  @Post()
  @ApiCreatedResponse({ type: ProductResponseDto })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    const product = await this.productsService.create(dto);
    return toProductResponse(product);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.update(id, dto);
    return toProductResponse(product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
