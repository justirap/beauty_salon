import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('REST API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('odrzuca listę zabiegów bez tokenu', async () => {
    const response = await request(app.getHttpServer()).get('/api/treatments');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Brak lub nieprawidłowy token');
  });

  it('odrzuca logowanie ze złym hasłem', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'zofia.nowak@example.com', password: 'zle-haslo' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Nieprawidłowy e-mail lub hasło');
  });

  it('blokuje wizytę u stylistki bez uprawnienia do zabiegu', async () => {
    const server = app.getHttpServer();
    const login = await request(server).post('/api/auth/login').send({
      email: 'zofia.nowak@example.com',
      password: 'haslo1234',
    });

    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('CLIENT');

    const token = login.body.accessToken as string;
    const treatments = await request(server)
      .get('/api/treatments')
      .query({ search: 'Henna brwi' })
      .set('Authorization', `Bearer ${token}`);
    const henna = treatments.body.data.find(
      (item: { name: string }) => item.name === 'Henna brwi',
    );
    const stylists = await request(server)
      .get('/api/stylists')
      .set('Authorization', `Bearer ${token}`);
    const magdalena = stylists.body.find(
      (person: { lastName: string }) => person.lastName === 'Szymańska',
    );
    const startsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const booked = await request(server)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        stylistId: magdalena.id,
        treatmentId: henna.id,
        startsAt,
      });

    expect(booked.status).toBe(409);
    expect(booked.body.message).toBe('Ta stylistka nie wykonuje tego zabiegu');
  });
});
