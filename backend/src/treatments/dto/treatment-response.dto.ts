import { ApiProperty } from '@nestjs/swagger';
import { TreatmentIngredient } from '../treatment-ingredient.entity';
import { Treatment } from '../treatment.entity';

export class TreatmentIngredientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  quantityPerVisit: number;
}

export class TreatmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  price: number;

  @ApiProperty({ type: [TreatmentIngredientResponseDto] })
  ingredients: TreatmentIngredientResponseDto[];
}

export function toIngredientResponse(
  ingredient: TreatmentIngredient,
): TreatmentIngredientResponseDto {
  return {
    id: ingredient.id,
    productId: ingredient.productId,
    productName: ingredient.product?.name ?? '',
    quantityPerVisit: ingredient.quantityPerVisit,
  };
}

export function toTreatmentResponse(
  treatment: Treatment,
): TreatmentResponseDto {
  const ingredients = [...(treatment.ingredients ?? [])].sort((left, right) =>
    (left.product?.name ?? '').localeCompare(right.product?.name ?? '', 'pl'),
  );

  return {
    id: treatment.id,
    name: treatment.name,
    description: treatment.description,
    durationMinutes: treatment.durationMinutes,
    price: Number(treatment.price),
    ingredients: ingredients.map((ingredient) =>
      toIngredientResponse(ingredient),
    ),
  };
}
