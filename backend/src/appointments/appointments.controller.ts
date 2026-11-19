import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole, User } from '../users/user.entity';
import {
  AppointmentPhotosService,
  PHOTO_MAX_BYTES,
} from './appointment-photos.service';
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

const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly photosService: AppointmentPhotosService,
  ) {}

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

  @Post(':id/photos')
  @Roles(UserRole.CLIENT)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ schema: { properties: { id: { type: 'string' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PHOTO_MAX_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!PHOTO_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Dozwolone są pliki JPG, PNG i WEBP'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async addPhoto(
    @Req() request: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { mimetype: string; buffer: Buffer } | undefined,
  ): Promise<{ id: string }> {
    const photo = await this.photosService.add(request.user, id, file);
    return { id: photo.id };
  }

  @Get(':id/photos/:photoId/file')
  @ApiOkResponse({
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
  })
  async photoFile(
    @Req() request: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<StreamableFile> {
    const file = await this.photosService.open(request.user, id, photoId);
    return new StreamableFile(file.stream, { type: file.mimeType });
  }

  @Delete(':id/photos/:photoId')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(
    @Req() request: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<void> {
    return this.photosService.remove(request.user, id, photoId);
  }
}
