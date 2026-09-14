import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { PublicUser } from '../users/users.service';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';

import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a CLIENT account' })
  @ApiResponse({ status: 201, description: 'Account created and signed in' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    const { user, accessToken } = await this.auth.register(dto);
    this.setAuthCookie(res, accessToken);
    return { user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in' })
  @ApiResponse({ status: 200, description: 'Signed in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    const { user, accessToken } = await this.auth.login(dto);
    this.setAuthCookie(res, accessToken);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  me(@Req() req: Request): Promise<PublicUser> {
    return this.auth.getProfile(req.user.id);
  }

  private setAuthCookie(res: Response, token: string): void {
    const maxAgeSeconds = Number(
      this.config.get('JWT_EXPIRES_IN_SECONDS', 3600),
    );
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: maxAgeSeconds * 1000,
    });
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/',
    };
  }
}
