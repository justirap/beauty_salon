import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Treatment } from '../treatments/treatment.entity';
import { User } from '../users/user.entity';
import { StylistSkill } from './stylist-skill.entity';

const BASE_SKILLS: Array<{ email: string; treatments: string[] }> = [
  {
    email: 'karolina.zielinska@example.com',
    treatments: ['Laminacja brwi', 'Henna brwi', 'Regulacja brwi'],
  },
  {
    email: 'magdalena.szymanska@example.com',
    treatments: ['Manicure hybrydowy', 'Pedicure kosmetyczny', 'Masaż twarzy'],
  },
];

@Injectable()
export class AppointmentSeedService implements OnModuleInit {
  private readonly logger = new Logger(AppointmentSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Treatment)
    private readonly treatmentsRepository: Repository<Treatment>,
    @InjectRepository(StylistSkill)
    private readonly skillsRepository: Repository<StylistSkill>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const entry of BASE_SKILLS) {
      const stylist = await this.usersRepository.findOne({
        where: { email: entry.email },
      });
      if (!stylist) {
        continue;
      }

      for (const treatmentName of entry.treatments) {
        const treatment = await this.treatmentsRepository.findOne({
          where: { name: treatmentName },
        });
        if (!treatment) {
          continue;
        }

        const existing = await this.skillsRepository.findOne({
          where: { stylistId: stylist.id, treatmentId: treatment.id },
        });
        if (existing) {
          continue;
        }

        await this.skillsRepository.save(
          this.skillsRepository.create({
            stylistId: stylist.id,
            treatmentId: treatment.id,
          }),
        );
        this.logger.log(
          `Przypisano ${treatment.name} stylistce ${stylist.firstName} ${stylist.lastName}`,
        );
      }
    }
  }
}
