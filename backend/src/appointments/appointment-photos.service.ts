import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole, User } from '../users/user.entity';
import { AppointmentPhoto } from './appointment-photo.entity';
import { Appointment, AppointmentStatus } from './appointment.entity';

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function uploadsDirectory(): string {
  return join(process.cwd(), 'uploads');
}

@Injectable()
export class AppointmentPhotosService {
  constructor(
    @InjectRepository(AppointmentPhoto)
    private readonly photosRepository: Repository<AppointmentPhoto>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  async attach(appointments: Appointment[]): Promise<void> {
    if (appointments.length === 0) {
      return;
    }

    const photos = await this.photosRepository.find({
      where: { appointmentId: In(appointments.map((item) => item.id)) },
      order: { id: 'ASC' },
    });
    for (const appointment of appointments) {
      appointment.photos = photos.filter(
        (photo) => photo.appointmentId === appointment.id,
      );
    }
  }

  async add(
    user: User,
    appointmentId: string,
    file: { mimetype: string; buffer: Buffer } | undefined,
  ): Promise<AppointmentPhoto> {
    if (user.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Zdjęcie dodaje klientka');
    }
    if (!file || file.buffer.length === 0) {
      throw new BadRequestException('Dodaj plik zdjęcia');
    }

    const extension = PHOTO_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Dozwolone są pliki JPG, PNG i WEBP');
    }
    if (file.buffer.length > PHOTO_MAX_BYTES) {
      throw new BadRequestException('Zdjęcie może mieć najwyżej 2 MB');
    }

    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment || appointment.clientId !== user.id) {
      throw new NotFoundException('Nie znaleziono wizyty');
    }
    if (appointment.status !== AppointmentStatus.BOOKED) {
      throw new ConflictException(
        'Nie można dodać zdjęcia do odwołanej wizyty',
      );
    }

    const fileName = `${randomUUID()}${extension}`;
    await mkdir(uploadsDirectory(), { recursive: true });
    await writeFile(join(uploadsDirectory(), fileName), file.buffer);

    try {
      return await this.photosRepository.save(
        this.photosRepository.create({
          appointmentId,
          fileName,
          mimeType: file.mimetype,
        }),
      );
    } catch (error) {
      await unlink(join(uploadsDirectory(), fileName)).catch(() => undefined);
      throw error;
    }
  }

  async remove(user: User, appointmentId: string, photoId: string): Promise<void> {
    const photo = await this.photosRepository.findOne({
      where: { id: photoId, appointmentId },
      relations: { appointment: true },
    });
    if (!photo) {
      throw new NotFoundException('Nie znaleziono zdjęcia');
    }
    if (user.role !== UserRole.CLIENT || photo.appointment.clientId !== user.id) {
      throw new ForbiddenException('Brak uprawnień');
    }

    await this.photosRepository.delete(photo.id);
    await unlink(join(uploadsDirectory(), photo.fileName)).catch(
      () => undefined,
    );
  }

  async open(
    user: User,
    appointmentId: string,
    photoId: string,
  ): Promise<{ stream: Readable; mimeType: string }> {
    const photo = await this.photosRepository.findOne({
      where: { id: photoId, appointmentId },
      relations: { appointment: true },
    });
    if (!photo) {
      throw new NotFoundException('Nie znaleziono zdjęcia');
    }

    const appointment = photo.appointment;
    const canSee =
      user.role === UserRole.ADMIN ||
      (user.role === UserRole.CLIENT && appointment.clientId === user.id) ||
      (user.role === UserRole.STYLIST && appointment.stylistId === user.id);
    if (!canSee) {
      throw new ForbiddenException('Brak uprawnień');
    }

    const fullPath = join(uploadsDirectory(), photo.fileName);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Nie znaleziono zdjęcia');
    }

    return {
      stream: createReadStream(fullPath),
      mimeType: photo.mimeType,
    };
  }
}
