import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PublicUser, UsersService } from '../users/users.service';
import type { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      password: passwordHash,
    });

    this.logger.log(`Registered user ${user.id} as ${user.role}`);
    return { user, accessToken: await this.signToken(user) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const valid = user
      ? await argon2.verify(user.password, dto.password)
      : false;
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password, ...publicUser } = user;
    this.logger.log(`User ${user.id} logged in`);
    return { user: publicUser, accessToken: await this.signToken(publicUser) };
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return user;
  }

  private signToken(user: PublicUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.signAsync(payload);
  }
}
