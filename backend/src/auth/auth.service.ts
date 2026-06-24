import { Injectable, BadRequestException, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async seedAdmin() {
    const email = 'admin@checklist.com';
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash('adminpassword123', 10);
      await this.prisma.user.create({
        data: {
          email,
          name: 'System Administrator',
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      return { message: 'Admin user successfully seeded.' };
    }
    return { message: 'Admin user already exists.' };
  }

  async validateUser(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase().trim();
    console.log(`[LOGIN ATTEMPT] Email: '${email}', Password length: ${loginDto.password.length}`);
    
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`[LOGIN FAILED] User not found for email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'INACTIVE') {
      console.log(`[LOGIN FAILED] User ${email} is INACTIVE`);
      throw new UnauthorizedException('Your account has been disabled. Please contact the administrator.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      console.log(`[LOGIN FAILED] Invalid password for ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log(`[LOGIN SUCCESS] ${email} logged in successfully`);
    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log to Audit logs
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: JSON.stringify({ email: user.email }),
      },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto,
      },
    };
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new UnauthorizedException('No user from google');
    }
    const email = req.user.email.toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create user if they don't exist
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          name: req.user.name,
          passwordHash,
          role: 'USER', // Default role
          status: 'ACTIVE',
          profilePhoto: req.user.profilePhoto,
        },
      });
    }

    // Call standard login to generate token and log the event
    return this.login(user);
  }

  async inviteUser(inviteDto: InviteDto, adminId: string) {
    const email = inviteDto.email.toLowerCase();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('A user with this email address already exists');
    }

    // Check for existing active invitation
    const existingInvite = await this.prisma.invitation.findUnique({ where: { email } });
    if (existingInvite && existingInvite.expiresAt > new Date() && existingInvite.status === 'PENDING') {
      // Re-send existing invitation
      await this.emailService.sendInvitation(email, inviteDto.name, existingInvite.token);
      return { message: 'Invitation email re-sent successfully' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

    // Save invitation
    await this.prisma.invitation.upsert({
      where: { email },
      update: {
        name: inviteDto.name,
        token,
        expiresAt,
        status: 'PENDING',
        createdAt: new Date(),
      },
      create: {
        email,
        name: inviteDto.name,
        token,
        expiresAt,
        status: 'PENDING',
      },
    });

    // Create user placeholder in PENDING_INVITE status
    const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    await this.prisma.user.upsert({
      where: { email },
      update: {
        name: inviteDto.name,
        status: 'PENDING_INVITE',
      },
      create: {
        email,
        name: inviteDto.name,
        passwordHash: dummyPasswordHash,
        role: 'USER',
        status: 'PENDING_INVITE',
      },
    });

    // Send invitation email
    await this.emailService.sendInvitation(email, inviteDto.name, token);

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_INVITED',
        details: JSON.stringify({ invitedEmail: email }),
      },
    });

    return { message: 'Invitation sent successfully' };
  }

  async verifyInviteToken(token: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { token } });

    if (!invite) {
      throw new NotFoundException('Invitation token is invalid');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException(`Invitation has already been ${invite.status.toLowerCase()}`);
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation link has expired');
    }

    return {
      email: invite.email,
      name: invite.name,
    };
  }

  async acceptInvitation(acceptInviteDto: AcceptInviteDto) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token: acceptInviteDto.token },
    });

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    const passwordHash = await bcrypt.hash(acceptInviteDto.password, 10);

    // Update user record
    const user = await this.prisma.user.update({
      where: { email: invite.email },
      data: {
        name: acceptInviteDto.name,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    // Mark invite accepted
    await this.prisma.invitation.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'INVITATION_ACCEPTED',
        details: JSON.stringify({ email: user.email }),
      },
    });

    return this.login(user);
  }
}
