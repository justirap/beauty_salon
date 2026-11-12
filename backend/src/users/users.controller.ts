import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  toUserResponse,
  UserResponseDto,
} from '../auth/dto/auth-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ListUsersQueryDto,
  UserListResponseDto,
} from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, User } from './user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserListResponseDto })
  async list(@Query() query: ListUsersQueryDto): Promise<UserListResponseDto> {
    const result = await this.usersService.findAll(query);
    return {
      data: result.users.map((user) => toUserResponse(user)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post()
  @ApiCreatedResponse({ type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.createAccount(dto);
    return toUserResponse(user);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, dto);
    return toUserResponse(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user: User },
  ): Promise<void> {
    return this.usersService.remove(id, request.user.id);
  }
}
