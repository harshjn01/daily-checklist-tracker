import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { AssignChecklistDto } from './dto/assign-checklist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../types/enums';

@Controller('checklists')
@UseGuards(JwtAuthGuard)
export class ChecklistsController {
  constructor(private checklistsService: ChecklistsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAll(@Query('status') status?: string) {
    return this.checklistsService.findAll(status);
  }

  @Get('assigned/today')
  async getAssignedForToday(
    @Request() req: any,
    @Query('userId') queryUserId?: string,
    @Query('date') queryDate?: string,
  ) {
    // If admin is requesting for another user, let them. Otherwise, normal users can only view their own
    let targetUserId = req.user.id;
    if (req.user.role === Role.ADMIN && queryUserId) {
      targetUserId = queryUserId;
    }

    // Default date is today (server-side date in YYYY-MM-DD format)
    const dateStr = queryDate || new Date().toISOString().split('T')[0];
    return this.checklistsService.findAssignedForToday(targetUserId, dateStr);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getOne(@Param('id') id: string) {
    return this.checklistsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() createChecklistDto: CreateChecklistDto, @Request() req: any) {
    return this.checklistsService.create(createChecklistDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateChecklistDto: UpdateChecklistDto,
    @Request() req: any,
  ) {
    return this.checklistsService.update(id, updateChecklistDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.checklistsService.delete(id, req.user.id);
  }

  @Post('assign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async assign(@Body() assignChecklistDto: AssignChecklistDto, @Request() req: any) {
    return this.checklistsService.assign(assignChecklistDto, req.user.id);
  }

  @Post('complete/:id')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('id') id: string,
    @Request() req: any,
    @Body('date') bodyDate?: string,
  ) {
    const dateStr = bodyDate || new Date().toISOString().split('T')[0];
    return this.checklistsService.toggleComplete(id, req.user.id, dateStr, true);
  }

  @Delete('complete/:id')
  @HttpCode(HttpStatus.OK)
  async uncomplete(
    @Param('id') id: string,
    @Request() req: any,
    @Query('date') queryDate?: string,
  ) {
    const dateStr = queryDate || new Date().toISOString().split('T')[0];
    return this.checklistsService.toggleComplete(id, req.user.id, dateStr, false);
  }
}
