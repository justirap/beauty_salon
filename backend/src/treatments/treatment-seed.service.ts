import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';

const BASE_TREATMENTS: Array<{
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
}> = [
  {
    name: 'Laminacja brwi',
    description: 'Ułożenie i odżywienie włosków brwi.',
    durationMinutes: 60,
    price: 90,
  },
  {
    name: 'Henna brwi',
    description: 'Geometria brwi i koloryzacja henną.',
    durationMinutes: 30,
    price: 45,
  },
  {
    name: 'Manicure hybrydowy',
    description: 'Opracowanie płytki, kolor hybrydowy i oliwka.',
    durationMinutes: 90,
    price: 140,
  },
  {
    name: 'Masaż twarzy',
    description: 'Relaksacyjny masaż twarzy z serum.',
    durationMinutes: 40,
    price: 110,
  },
  {
    name: 'Pedicure kosmetyczny',
    description: 'Opracowanie stóp, skórek i lakier.',
    durationMinutes: 60,
    price: 120,
  },
  {
    name: 'Regulacja brwi',
    description: 'Regulacja woskiem i pęsetą.',
    durationMinutes: 15,
    price: 30,
  },
];

@Injectable()
export class TreatmentSeedService implements OnModuleInit {
  private readonly logger = new Logger(TreatmentSeedService.name);

  constructor(private readonly treatmentsService: TreatmentsService) {}

  async onModuleInit(): Promise<void> {
    for (const treatment of BASE_TREATMENTS) {
      const existing = await this.treatmentsService.findByName(treatment.name);
      if (existing) {
        continue;
      }

      await this.treatmentsService.create(treatment);
      this.logger.log(`Utworzono zabieg ${treatment.name}`);
    }
  }
}
