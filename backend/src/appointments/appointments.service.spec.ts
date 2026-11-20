import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentStockLine } from './appointment-stock-line.entity';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { AppointmentsService } from './appointments.service';
import { formatTerm } from './format-term';
import { StylistSkill } from './stylist-skill.entity';
import { Treatment } from '../treatments/treatment.entity';
import { Product } from '../products/product.entity';
import { UserRole, User } from '../users/user.entity';

jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));

function client(): User {
  return {
    id: 'client-1',
    firstName: 'Zofia',
    lastName: 'Nowak',
    email: 'zofia.nowak@example.com',
    role: UserRole.CLIENT,
  } as User;
}

function stylist(): User {
  return {
    id: 'stylist-1',
    firstName: 'Karolina',
    lastName: 'Zielińska',
    email: 'karolina.zielinska@example.com',
    role: UserRole.STYLIST,
  } as User;
}

function henna(stock = 5) {
  return {
    id: 'treatment-1',
    name: 'Henna brwi',
    durationMinutes: 30,
    ingredients: [
      {
        productId: 'product-1',
        quantityPerVisit: 1,
        product: { id: 'product-1', name: 'Henna', stock },
      },
    ],
  };
}

function chain(read: () => unknown) {
  const builder = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'then') {
          return undefined;
        }
        if (property === 'getOne' || property === 'getMany') {
          return async () => read();
        }
        return () => builder;
      },
    },
  );
  return builder;
}

function harness(options: {
  stylist?: User | null;
  treatment?: ReturnType<typeof henna> | null;
  skill?: object | null;
  clashes?: Array<object | null>;
  appointmentReads?: Array<object | null>;
  products?: Product[];
  stockLines?: AppointmentStockLine[];
  savedAppointment?: Partial<Appointment> | null;
}) {
  const productsSaved: Product[] = [];
  const appointmentsSaved: Appointment[] = [];
  const clashes = [...(options.clashes ?? [])];
  const appointmentReads = [...(options.appointmentReads ?? [])];
  const products = options.products ?? [
    { id: 'product-1', name: 'Henna', stock: 5 } as Product,
  ];

  const manager = {
    getRepository(entity: { name: string }) {
      const name = entity.name;
      return {
        createQueryBuilder: () =>
          chain(() => {
            if (name === User.name) {
              return options.stylist === undefined ? stylist() : options.stylist;
            }
            if (name === Appointment.name) {
              if (options.appointmentReads) {
                return appointmentReads.shift() ?? null;
              }
              return clashes.shift() ?? null;
            }
            if (name === Product.name) {
              return products;
            }
            return null;
          }),
        findOne: async () => {
          if (name === Treatment.name) {
            return options.treatment === undefined ? henna() : options.treatment;
          }
          if (name === StylistSkill.name) {
            return options.skill === undefined ? { id: 'skill-1' } : options.skill;
          }
          if (name === Appointment.name) {
            return options.savedAppointment === undefined
              ? null
              : options.savedAppointment;
          }
          return null;
        },
        find: async () => options.stockLines ?? [],
        create: (value: object) => value,
        save: async (value: Appointment | Product | Appointment[]) => {
          if (name === Product.name) {
            productsSaved.push(value as Product);
          }
          if (name === Appointment.name) {
            const saved = {
              id: 'appointment-1',
              ...(value as Appointment),
            };
            appointmentsSaved.push(saved);
            return saved;
          }
          return value;
        },
      };
    },
  };

  const events: unknown[] = [];
  let transactions = 0;
  const service = new AppointmentsService(
    {
      transaction: async (callback: (current: typeof manager) => Promise<unknown>) => {
        transactions += 1;
        return callback(manager);
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { emitAsync: async (_name: string, payload: unknown) => events.push(payload) } as never,
  );

  return { service, productsSaved, appointmentsSaved, events, get transactions() { return transactions; } };
}

const future = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

describe('AppointmentsService', () => {
  it('nie umawia osoby, która nie jest klientką', async () => {
    const state = harness({});

    await expect(
      state.service.create(
        { ...client(), role: UserRole.STYLIST },
        { stylistId: 'stylist-1', treatmentId: 'treatment-1', startsAt: future() },
      ),
    ).rejects.toThrow(new ForbiddenException('Wizytę umawia klientka'));
    expect(state.transactions).toBe(0);
  });

  it('nie umawia wizyty w przeszłości', async () => {
    const state = harness({});

    await expect(
      state.service.create(client(), {
        stylistId: 'stylist-1',
        treatmentId: 'treatment-1',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    ).rejects.toThrow(new BadRequestException('Nie można umówić wizyty w przeszłości'));
    expect(state.transactions).toBe(0);
  });

  it('blokuje zabieg, którego stylistka nie wykonuje', async () => {
    const { service, appointmentsSaved, events } = harness({ skill: null });

    await expect(
      service.create(client(), {
        stylistId: 'stylist-1',
        treatmentId: 'treatment-1',
        startsAt: future(),
      }),
    ).rejects.toThrow(new ConflictException('Ta stylistka nie wykonuje tego zabiegu'));
    expect(appointmentsSaved).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('blokuje termin nachodzący na wizytę stylistki', async () => {
    const endsAt = new Date('2026-11-21T10:00:00.000Z');
    const { service } = harness({
      clashes: [{ id: 'busy', endsAt }],
    });

    await expect(
      service.create(client(), {
        stylistId: 'stylist-1',
        treatmentId: 'treatment-1',
        startsAt: future(),
      }),
    ).rejects.toThrow(
      new ConflictException(
        `Stylistka jest zajęta do ${formatTerm(endsAt)}. Wybierz późniejszy termin`,
      ),
    );
  });

  it('blokuje drugą nachodzącą wizytę tej samej klientki', async () => {
    const endsAt = new Date('2026-11-21T11:00:00.000Z');
    const { service } = harness({
      clashes: [null, { id: 'own', endsAt }],
    });

    await expect(
      service.create(client(), {
        stylistId: 'stylist-1',
        treatmentId: 'treatment-1',
        startsAt: future(),
      }),
    ).rejects.toThrow(
      new ConflictException(
        `Masz już wizytę do ${formatTerm(endsAt)}. Wybierz późniejszy termin`,
      ),
    );
  });

  it('nie schodzi ze stanu, gdy brakuje kosmetyku', async () => {
    const { service, productsSaved, appointmentsSaved } = harness({
      products: [{ id: 'product-1', name: 'Henna', stock: 0 } as Product],
    });

    await expect(
      service.create(client(), {
        stylistId: 'stylist-1',
        treatmentId: 'treatment-1',
        startsAt: future(),
      }),
    ).rejects.toThrow(
      new ConflictException('Brakuje kosmetyków na magazynie: Henna'),
    );
    expect(productsSaved).toHaveLength(0);
    expect(appointmentsSaved).toHaveLength(0);
  });

  it('zapisuje wizytę na cały czas zabiegu i zmniejsza stan', async () => {
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const loaded = {
      id: 'appointment-1',
      client: client(),
      treatment: { name: 'Henna brwi' },
      startsAt,
    };
    const { service, appointmentsSaved, productsSaved, events } = harness({
      savedAppointment: loaded,
    });

    const created = await service.create(client(), {
      stylistId: 'stylist-1',
      treatmentId: 'treatment-1',
      startsAt: startsAt.toISOString(),
    });

    expect(created).toBe(loaded);
    expect(appointmentsSaved[0].status).toBe(AppointmentStatus.BOOKED);
    expect(appointmentsSaved[0].endsAt.getTime()).toBe(
      startsAt.getTime() + 30 * 60_000,
    );
    expect(productsSaved[0].stock).toBe(4);
    expect(events).toHaveLength(1);
  });

  it('przy odwołaniu zwraca kosmetyk na magazyn', async () => {
    const startsAt = new Date('2026-11-21T09:00:00.000Z');
    const booked = {
      id: 'appointment-1',
      clientId: 'client-1',
      status: AppointmentStatus.BOOKED,
      startsAt,
    } as Appointment;
    const product = { id: 'product-1', name: 'Henna', stock: 4 } as Product;
    const { service, productsSaved, events } = harness({
      appointmentReads: [booked],
      savedAppointment: {
        ...booked,
        client: client(),
        treatment: { name: 'Henna brwi' },
      },
      products: [product],
      stockLines: [
        { appointmentId: 'appointment-1', productId: 'product-1', quantity: 1 } as AppointmentStockLine,
      ],
    });

    await service.cancel(client(), 'appointment-1');

    expect(booked.status).toBe(AppointmentStatus.CANCELLED);
    expect(productsSaved[0].stock).toBe(5);
    expect(events).toHaveLength(1);
  });

  it('nie pozwala stylistce odwołać wizyty', async () => {
    const { service, events } = harness({
      appointmentReads: [
        {
          id: 'appointment-1',
          clientId: 'client-1',
          status: AppointmentStatus.BOOKED,
        } as Appointment,
      ],
    });

    await expect(service.cancel(stylist(), 'appointment-1')).rejects.toThrow(
      new ForbiddenException('Brak uprawnień'),
    );
    expect(events).toHaveLength(0);
  });
});
