import { ApiProperty } from '@nestjs/swagger';
import { Treatment } from '../treatment.entity';

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
}

export function toTreatmentResponse(
  treatment: Treatment,
): TreatmentResponseDto {
  return {
    id: treatment.id,
    name: treatment.name,
    description: treatment.description,
    durationMinutes: treatment.durationMinutes,
    price: Number(treatment.price),
  };
}
