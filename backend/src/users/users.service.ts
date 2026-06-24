import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import { Role, UserStatus } from '../types/enums';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  async findAll(search?: string, role?: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          profilePhoto: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        profilePhoto: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto, adminId: string) {
    const email = createUserDto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: createUserDto.name,
        passwordHash,
        role: createUserDto.role,
        status: UserStatus.ACTIVE,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_CREATED',
        details: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, actorId: string) {
    const user = await this.findOne(id);

    const data: any = {};
    if (updateUserDto.name !== undefined) data.name = updateUserDto.name;
    if (updateUserDto.role !== undefined) data.role = updateUserDto.role;
    if (updateUserDto.status !== undefined) data.status = updateUserDto.status;

    if (updateUserDto.email !== undefined) {
      const email = updateUserDto.email.toLowerCase();
      if (email !== user.email) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
          throw new ConflictException('Email is already registered');
        }
        data.email = email;
      }
    }

    if (updateUserDto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_UPDATED',
        details: JSON.stringify({ userId: id, updatedFields: Object.keys(data) }),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
      profilePhoto: updated.profilePhoto,
    };
  }

  async delete(id: string, adminId: string) {
    const user = await this.findOne(id);
    if (user.id === adminId) {
      throw new BadRequestException('You cannot delete your own admin account');
    }

    await this.prisma.user.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_DELETED',
        details: JSON.stringify({ deletedEmail: user.email, deletedName: user.name }),
      },
    });

    return { message: 'User deleted successfully' };
  }

  async updateProfilePhoto(id: string, photoPath: string) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { profilePhoto: photoPath },
    });
    return {
      id: updated.id,
      profilePhoto: updated.profilePhoto,
    };
  }

  async bulkImportCsv(fileBuffer: Buffer, adminId: string) {
    let records: any[] = [];
    try {
      const fileContent = fileBuffer.toString('utf-8');
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err) {
      throw new BadRequestException('Failed to parse CSV file. Ensure columns are name and email.');
    }

    const results = {
      total: records.length,
      successCount: 0,
      failedCount: 0,
      errors: [] as string[],
    };

    for (const record of records) {
      const name = record.name || record.Name;
      const email = record.email || record.Email;

      if (!name || !email) {
        results.failedCount++;
        results.errors.push(`Row missing name or email: ${JSON.stringify(record)}`);
        continue;
      }

      try {
        await this.authService.inviteUser({ name, email }, adminId);
        results.successCount++;
      } catch (err: any) {
        results.failedCount++;
        results.errors.push(`Failed to invite ${email}: ${err.message}`);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USERS_BULK_IMPORT',
        details: JSON.stringify({
          total: results.total,
          success: results.successCount,
          failed: results.failedCount,
        }),
      },
    });

    return results;
  }
}
