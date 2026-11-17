import { Transform } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

function toNumber(value: unknown): unknown {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }
  return value;
}

export class CreateIngredientDto {
  @IsUUID()
  productId: string;

  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  quantityPerVisit: number;
}
