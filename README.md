# Glamora — salon kosmetyczny

Aplikacja webowa do obsługi salonu kosmetycznego. Klientki przeglądają zabiegi, wybierają stylistkę i umawiają wizytę. Stylistki prowadzą kalendarz, a właścicielka (admin) zarządza ofertą, personelem i magazynem kosmetyków.

## Technologie

- Backend: NestJS, REST API, TypeORM
- Frontend: React, JavaScript, Vite
- Baza danych: PostgreSQL 16
- Docker Compose

## Uruchomienie

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

**Docker (backend + baza + frontend):**

```bash
docker compose up --build
```

- Frontend: http://localhost
- API / Swagger: http://localhost:3000/api/docs
- PostgreSQL: localhost:5432

**Lokalnie:**

```bash
docker compose up db -d
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Frontend: http://localhost:5173

## Główne funkcjonalności

- Rejestracja, logowanie i role: klientka, stylistka, admin
- Katalog zabiegów oraz umawianie, odwoływanie i podgląd wizyt
- Kalendarz stylistki z blokadą nachodzących się terminów
- Panel admina: zabiegi, personel i magazyn kosmetyków
- Zdjęcia inspiracji

Reguły biznesowe:

1. Brak kolizji terminów u tej samej stylistki
2. Stylistka wykonuje tylko zabiegi, do których ma uprawnienia
3. Zabieg wymaga dostępnych kosmetyków na magazynie

## Dokumentacja REST API

Swagger: http://localhost:3000/api/docs

