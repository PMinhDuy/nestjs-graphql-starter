import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private buildTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload);
    // Refresh token uses a separate secret so a leaked access token cannot mint new tokens
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? this.config.get<string>('app.jwtSecret') + '_refresh',
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(input.password, 12);
    const user = await this.usersService.create({
      email: input.email,
      name: input.name,
      password: hashed,
      role: input.role,
    });

    const { accessToken, refreshToken } = this.buildTokens(user.id, user.email);
    return { accessToken, refreshToken, user };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = this.buildTokens(user.id, user.email);
    return { accessToken, refreshToken, user };
  }

  async refreshTokens(token: string): Promise<AuthResponse> {
    let payload: { sub: string; email: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? this.config.get<string>('app.jwtSecret') + '_refresh',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const { accessToken, refreshToken } = this.buildTokens(user.id, user.email);
    return { accessToken, refreshToken, user };
  }
}
