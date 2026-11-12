import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';

const BASE_ACCOUNTS: Array<{
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}> = [
  {
    firstName: 'Zofia',
    lastName: 'Nowak',
    email: 'zofia.nowak@example.com',
    role: UserRole.CLIENT,
  },
  {
    firstName: 'Hanna',
    lastName: 'Wiśniewska',
    email: 'hanna.wisniewska@example.com',
    role: UserRole.CLIENT,
  },
  {
    firstName: 'Maria',
    lastName: 'Wójcik',
    email: 'maria.wojcik@example.com',
    role: UserRole.CLIENT,
  },
  {
    firstName: 'Aleksandra',
    lastName: 'Kamińska',
    email: 'aleksandra.kaminska@example.com',
    role: UserRole.CLIENT,
  },
  {
    firstName: 'Natalia',
    lastName: 'Lewandowska',
    email: 'natalia.lewandowska@example.com',
    role: UserRole.CLIENT,
  },
  {
    firstName: 'Karolina',
    lastName: 'Zielińska',
    email: 'karolina.zielinska@example.com',
    role: UserRole.STYLIST,
  },
  {
    firstName: 'Magdalena',
    lastName: 'Szymańska',
    email: 'magdalena.szymanska@example.com',
    role: UserRole.STYLIST,
  },
];

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const password = this.config.get<string>('ADMIN_PASSWORD') || 'haslo1234';
    await this.ensureOwner(password);
    await this.ensureBaseAccounts(password);
  }

  private async ensureOwner(password: string): Promise<void> {
    if ((await this.usersService.countByRole(UserRole.ADMIN)) > 0) {
      return;
    }

    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    if (!email || !password) {
      this.logger.warn(
        'Brak właścicielki. Ustaw ADMIN_EMAIL i ADMIN_PASSWORD, aby utworzyć konto startowe.',
      );
      return;
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      await this.usersService.update(existing.id, { role: UserRole.ADMIN });
      this.logger.log(`Nadano rolę właścicielki kontu ${email}`);
      return;
    }

    await this.usersService.createAccount({
      firstName: this.config.get<string>('ADMIN_FIRST_NAME')?.trim() || 'Ewa',
      lastName: this.config.get<string>('ADMIN_LAST_NAME')?.trim() || 'Adamska',
      email,
      password,
      role: UserRole.ADMIN,
    });
    this.logger.log(`Utworzono konto właścicielki ${email}`);
  }

  private async ensureBaseAccounts(password: string): Promise<void> {
    for (const account of BASE_ACCOUNTS) {
      const existing = await this.usersService.findByEmail(account.email);
      if (existing) {
        continue;
      }

      await this.usersService.createAccount({
        ...account,
        password,
      });
      this.logger.log(`Utworzono konto ${account.email}`);
    }
  }
}
