import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { JwtRefreshGuard } from './jwt-refresh.guard.js';
import type { AuthUser } from './jwt-payload.interface.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // @Public skips the global access-token guard; JwtRefreshGuard checks the refresh token instead.
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() _dto: RefreshDto, @CurrentUser() user: AuthUser) {
    return this.auth.refresh(user);
  }

  // Protected by the global JwtAuthGuard. No DB call: data comes from the token.
  @ApiBearerAuth()
  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return user;
  }

  @ApiBearerAuth()
  @Roles('admin')
  @Get('admin')
  admin(@CurrentUser() user: AuthUser) {
    return { message: `Welcome, admin ${user.email}` };
  }
}
