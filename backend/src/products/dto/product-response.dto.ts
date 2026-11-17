import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../product.entity';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  stock: number;
}

export function toProductResponse(product: Product): ProductResponseDto {
  return {
    id: product.id,
    name: product.name,
    stock: product.stock,
  };
}
