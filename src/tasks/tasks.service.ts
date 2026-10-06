import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UserRole } from '@prisma/client';
import { TaskStatus } from '@prisma/client';
import { userMinimalSelect } from '../common/prisma/selects';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        creatorId: userId,
      },
      include: { assignee: true, creator: true, event: true },
    });
  }

  async findAll(user: { id: string; role: UserRole; institutionId?: string | null }, filters?: { status?: TaskStatus; assigneeId?: string; eventId?: string; boardId?: string }) {
    const where: any = {};

    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { assigneeId: user.id },
        { creatorId: user.id },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { assigneeId: user.id },
        { creatorId: user.id },
        { event: { institutionId: user.institutionId } },
      ];
    }

    if (filters?.status) where.status = filters.status;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.eventId) where.eventId = filters.eventId;
    if (filters?.boardId) where.boardId = filters.boardId;

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: userMinimalSelect },
        creator: { select: userMinimalSelect },
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: userMinimalSelect },
        creator: { select: userMinimalSelect },
        event: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (!this.canViewTask(task, user)) {
      throw new ForbiddenException('You do not have permission to view this task');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const task = await this.findById(id, user);

    if (!this.canModifyTask(task, user)) {
      throw new ForbiddenException('You do not have permission to modify this task');
    }

    const data: any = { ...updateTaskDto };

    if (updateTaskDto.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      data.completedAt = new Date();
    }

    return this.prisma.task.update({
      where: { id },
      data,
      include: { assignee: true, creator: true, event: true },
    });
  }

  async remove(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const task = await this.findById(id, user);

    if (!this.canModifyTask(task, user)) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    return this.prisma.task.delete({ where: { id } });
  }

  async getMyTasks(user: { id: string; role: UserRole; institutionId?: string | null }) {
    return this.prisma.task.findMany({
      where: {
        assigneeId: user.id,
        status: { not: TaskStatus.DONE },
      },
      include: {
        event: true,
        creator: { select: userMinimalSelect },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });
  }

  async getUpcomingTasks(user: { id: string; role: UserRole; institutionId?: string | null }, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.task.findMany({
      where: {
        assigneeId: user.id,
        status: { not: TaskStatus.DONE },
        dueDate: { lte: futureDate },
      },
      include: { event: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  private canViewTask(task: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (task.assigneeId === user.id) return true;
    if (task.creatorId === user.id) return true;
    return false;
  }

  private canModifyTask(task: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (task.creatorId === user.id) return true;
    if (task.assigneeId === user.id && [TaskStatus.TODO, TaskStatus.IN_PROGRESS].includes(task.status)) return true;
    return false;
  }
}