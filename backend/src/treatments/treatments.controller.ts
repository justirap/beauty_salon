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
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import {
  ListTreatmentsQueryDto,
  TreatmentListResponseDto,
} from './dto/list-treatments-query.dto';
import {
  toTreatmentResponse,
  TreatmentResponseDto,
} from './dto/treatment-response.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { TreatmentsService } from './treatments.service';

@ApiTags('treatments')
@ApiBearerAuth()
@Controller('treatments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Get()
  @ApiOkResponse({ type: TreatmentListResponseDto })
  async list(
    @Query() query: ListTreatmentsQueryDto,
  ): Promise<TreatmentListResponseDto> {
    const result = await this.treatmentsService.findAll(query);
    return {
      data: result.treatments.map((treatment) => toTreatmentResponse(treatment)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @ApiOkResponse({ type: TreatmentResponseDto })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TreatmentResponseDto> {
    const treatment = await this.treatmentsService.findById(id);
    if (!treatment) {
      throw new NotFoundException('Nie znaleziono zabiegu');
    }
    return toTreatmentResponse(treatment);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiCreatedResponse({ type: TreatmentResponseDto })
  async create(@Body() dto: CreateTreatmentDto): Promise<TreatmentResponseDto> {
    const treatment = await this.treatmentsService.create(dto);
    return toTreatmentResponse(treatment);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ type: TreatmentResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentDto,
  ): Promise<TreatmentResponseDto> {
    const treatment = await this.treatmentsService.update(id, dto);
    return toTreatmentResponse(treatment);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.treatmentsService.remove(id);
  }
}
