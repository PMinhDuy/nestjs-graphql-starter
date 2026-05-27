import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
  ) {}

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

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return { accessToken, user };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return { accessToken, user };
  }
}
