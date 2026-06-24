import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { AssignChecklistDto } from './dto/assign-checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  async create(createChecklistDto: CreateChecklistDto, adminId: string) {
    const checklist = await this.prisma.checklist.create({
      data: {
        title: createChecklistDto.title,
        description: createChecklistDto.description,
        isActive: createChecklistDto.isActive ?? true,
        isRequired: createChecklistDto.isRequired ?? true,
        createdById: adminId,
      },
    });

    // By default, when a checklist is created, assign it globally (userId = null)
    await this.prisma.checklistAssignment.create({
      data: {
        checklistId: checklist.id,
        userId: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CHECKLIST_CREATED',
        details: JSON.stringify({ checklistId: checklist.id, title: checklist.title }),
      },
    });

    return checklist;
  }

  async findAll(status?: string) {
    const where: any = {};
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    return this.prisma.checklist.findMany({
      where,
      include: {
        assignments: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id },
      include: {
        assignments: true,
      },
    });

    if (!checklist) {
      throw new NotFoundException(`Checklist item with ID ${id} not found`);
    }

    return checklist;
  }

  async update(id: string, updateChecklistDto: UpdateChecklistDto, adminId: string) {
    await this.findOne(id);

    const checklist = await this.prisma.checklist.update({
      where: { id },
      data: updateChecklistDto,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CHECKLIST_UPDATED',
        details: JSON.stringify({ checklistId: id, changes: Object.keys(updateChecklistDto) }),
      },
    });

    return checklist;
  }

  async delete(id: string, adminId: string) {
    const checklist = await this.findOne(id);

    await this.prisma.checklist.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CHECKLIST_DELETED',
        details: JSON.stringify({ checklistId: id, title: checklist.title }),
      },
    });

    return { message: 'Checklist item deleted successfully' };
  }

  async assign(assignChecklistDto: AssignChecklistDto, adminId: string) {
    const { checklistId, userIds } = assignChecklistDto;
    await this.findOne(checklistId);

    // Delete existing assignments
    await this.prisma.checklistAssignment.deleteMany({
      where: { checklistId },
    });

    if (!userIds || userIds.length === 0) {
      // Global assignment (userId = null)
      await this.prisma.checklistAssignment.create({
        data: {
          checklistId,
          userId: null,
        },
      });
    } else {
      // Specific assignments
      const data = userIds.map((userId) => ({
        checklistId,
        userId,
      }));
      await this.prisma.checklistAssignment.createMany({
        data,
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CHECKLIST_ASSIGNED',
        details: JSON.stringify({
          checklistId,
          isGlobal: !userIds || userIds.length === 0,
          assignedUserCount: userIds?.length || 0,
        }),
      },
    });

    return { message: 'Checklist assignments updated successfully' };
  }

  async findAssignedForToday(userId: string, dateString: string) {
    // Verify dateString format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }

    // 1. Get all active checklist items
    const activeChecklists = await this.prisma.checklist.findMany({
      where: { isActive: true },
      include: {
        assignments: true,
      },
    });

    // 2. Filter checklists assigned to this user or globally assigned
    const assignedChecklists = activeChecklists.filter((chk) => {
      const isGlobal = chk.assignments.some((a) => a.userId === null);
      const isAssignedToUser = chk.assignments.some((a) => a.userId === userId);
      return isGlobal || isAssignedToUser;
    });

    // 3. Get completions for this user on this date
    const completions = await this.prisma.checklistCompletion.findMany({
      where: {
        userId,
        date: dateString,
      },
    });

    // 4. Map checklists with completion status
    return assignedChecklists.map((chk) => {
      const comp = completions.find((c) => c.checklistId === chk.id);
      return {
        id: chk.id,
        title: chk.title,
        description: chk.description,
        isRequired: chk.isRequired,
        isCompleted: comp ? comp.isCompleted : false,
        completedAt: comp ? comp.completedAt : null,
      };
    });
  }

  async toggleComplete(checklistId: string, userId: string, dateString: string, isCompleted: boolean) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }

    // Verify checklist is active and assigned to user or global
    const checklist = await this.findOne(checklistId);
    if (!checklist.isActive) {
      throw new BadRequestException('Cannot toggle completion on an inactive checklist item');
    }

    const assignments = await this.prisma.checklistAssignment.findMany({
      where: { checklistId },
    });
    const isGlobal = assignments.some((a) => a.userId === null);
    const isAssigned = assignments.some((a) => a.userId === userId);

    if (!isGlobal && !isAssigned) {
      throw new BadRequestException('This checklist item is not assigned to you');
    }

    if (isCompleted) {
      // Mark as complete
      const completion = await this.prisma.checklistCompletion.upsert({
        where: {
          checklistId_userId_date: {
            checklistId,
            userId,
            date: dateString,
          },
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
        },
        create: {
          checklistId,
          userId,
          date: dateString,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CHECKLIST_COMPLETED',
          details: JSON.stringify({ checklistId, date: dateString }),
        },
      });

      return completion;
    } else {
      // Unmark completed (delete completion entry)
      await this.prisma.checklistCompletion.deleteMany({
        where: {
          checklistId,
          userId,
          date: dateString,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CHECKLIST_UNCOMPLETED',
          details: JSON.stringify({ checklistId, date: dateString }),
        },
      });

      return { isCompleted: false, completedAt: null };
    }
  }
}
