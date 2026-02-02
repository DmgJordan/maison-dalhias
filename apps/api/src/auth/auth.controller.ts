import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface LogoutResponse {
  message: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(): LogoutResponse {
    return { message: 'Déconnexion réussie' };
  }
}
