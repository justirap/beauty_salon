import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { AppointmentsService } from './appointments.service';
import { AssignSkillDto } from './dto/assign-skill.dto';
import { StylistResponseDto } from './dto/stylist-response.dto';

@ApiTags('stylists')
@ApiBearerAuth()
@Controller('stylists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StylistsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOkResponse({ type: [StylistResponseDto] })
  list(): Promise<StylistResponseDto[]> {
    return this.appointmentsService.listStylists();
  }

  @Post(':id/treatments')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  addSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSkillDto,
  ): Promise<void> {
    return this.appointmentsService.addSkill(id, dto.treatmentId);
  }

  @Delete(':id/treatments/:treatmentId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('treatmentId', ParseUUIDPipe) treatmentId: string,
  ): Promise<void> {
    return this.appointmentsService.removeSkill(id, treatmentId);
  }
}
