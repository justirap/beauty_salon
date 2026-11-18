import { IsUUID } from 'class-validator';

export class AssignSkillDto {
  @IsUUID()
  treatmentId: string;
}
