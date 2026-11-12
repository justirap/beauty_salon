import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: User;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Brak lub nieprawidłowy token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        header.slice('Bearer '.length).trim(),
      );
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Brak lub nieprawidłowy token');
      }
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Brak lub nieprawidłowy token');
    }
  }
}
