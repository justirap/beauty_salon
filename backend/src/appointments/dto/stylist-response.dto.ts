import { ApiProperty } from '@nestjs/swagger';

export class StylistTreatmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class StylistResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ type: [StylistTreatmentDto] })
  treatments: StylistTreatmentDto[];
}
