import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, UploadedFile, UseInterceptors, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Role } from '../types/enums';
import { extname, join } from 'path';
import * as fs from 'fs';

// Ensure uploads folder exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    return this.usersService.findAll(search, role, status, pageNum, limitNum);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: any) {
    // Users can read themselves, admins can read anyone
    if (req.user.role !== Role.ADMIN && req.user.id !== id) {
      throw new ForbiddenException('You do not have permission to view this user profile');
    }
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.create(createUserDto, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    // Normal users can only update their own name/password (not role/status)
    if (req.user.role !== Role.ADMIN) {
      if (req.user.id !== id) {
        throw new ForbiddenException('You cannot edit other user profiles');
      }
      if (updateUserDto.role !== undefined || updateUserDto.status !== undefined) {
        throw new ForbiddenException('You do not have permission to change your role or account status');
      }
    }
    return this.usersService.update(id, updateUserDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.usersService.delete(id, req.user.id);
  }

  @Post('profile/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `profile-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Only image files (jpg, jpeg, png) are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadPhoto(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No photo file uploaded');
    }
    // Path saved relative to root, e.g. /uploads/profile-1234.png
    const photoPath = `/uploads/${file.filename}`;
    return this.usersService.updateProfilePhoto(req.user.id, photoPath);
  }

  @Post('import-csv')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No CSV file uploaded');
    }
    return this.usersService.bulkImportCsv(file.buffer, req.user.id);
  }
}
