import { Controller, Post, Body, Get, Param, UseGuards, Request, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '../types/enums';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto);
    return this.authService.login(user);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const { token } = await this.authService.googleLogin(req);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/success?token=${token}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('invite')
  async invite(@Body() inviteDto: InviteDto, @Request() req: any) {
    return this.authService.inviteUser(inviteDto, req.user.id);
  }

  @Get('invite/verify/:token')
  async verifyInvite(@Param('token') token: string) {
    return this.authService.verifyInviteToken(token);
  }

  @Post('invite/accept')
  async acceptInvite(@Body() acceptInviteDto: AcceptInviteDto) {
    return this.authService.acceptInvitation(acceptInviteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    const user = req.user;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      profilePhoto: user.profilePhoto,
    };
  }

  @Get('seed')
  async seedAdmin() {
    return this.authService.seedAdmin();
  }
}
