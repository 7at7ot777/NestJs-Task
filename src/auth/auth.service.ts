import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PublicUser, User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { SignupDto } from './dto/signup.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { AuthUser, JwtPayload } from './jwt-payload.interface.js';

const SALT_ROUNDS = 10;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto): Promise<PublicUser> {
    if (this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.users.create(dto.email, hash, dto.role);
    return this.users.toPublic(user);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = this.users.findByEmail(dto.email);
    // Same message for unknown email and wrong password: don't leak which emails exist.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  // Refresh token already verified by JwtRefreshStrategy; re-read the user
  // so a deleted user (or changed role) is picked up.
  refresh(authUser: AuthUser): Promise<TokenPair> {
    const user = this.users.findById(authUser.userId);
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m') as JwtSignOptions['expiresIn'],
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d') as JwtSignOptions['expiresIn'],
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
