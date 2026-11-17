import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

function toNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return value;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }
  return value;
}

export class UpdateIngredientDto {
  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  quantityPerVisit?: number;
}
