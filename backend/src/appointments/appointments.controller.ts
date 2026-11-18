import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
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
import { UserRole, User } from '../users/user.entity';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  AppointmentListResponseDto,
  ListAppointmentsQueryDto,
} from './dto/list-appointments-query.dto';
import {
  AppointmentResponseDto,
  toAppointmentResponse,
} from './dto/appointment-response.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOkResponse({ type: AppointmentListResponseDto })
  async list(
    @Req() request: { user: User },
    @Query() query: ListAppointmentsQueryDto,
  ): Promise<AppointmentListResponseDto> {
    const result = await this.appointmentsService.findAll(request.user, query);
    return {
      data: result.appointments.map((appointment) =>
        toAppointmentResponse(appointment),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post()
  @Roles(UserRole.CLIENT)
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  async create(
    @Req() request: { user: User },
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentsService.create(
      request.user,
      dto,
    );
    return toAppointmentResponse(appointment);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AppointmentResponseDto })
  async cancel(
    @Req() request: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentsService.cancel(
      request.user,
      id,
    );
    return toAppointmentResponse(appointment);
  }
}
