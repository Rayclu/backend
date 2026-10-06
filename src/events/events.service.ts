import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { UserRole, UserStatus, EventStatus, EventVisibility, EventCategory } from '@prisma/client';
import { userMinimalSelect } from '../common/prisma/selects';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, userId: string) {
    return this.prisma.event.create({
      data: {
        ...createEventDto,
        creatorId: userId,
        tags: createEventDto.tags || [],
      },
    });
  }

  async findAll(query: EventQueryDto, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category,
      visibility,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      city,
      country,
      institutionId,
      boardId,
      groupId,
      creatorId,
      assigneeId,
      tags,
      sortBy = 'startDate',
      sortOrder = 'asc',
    } = query;

    const where: any = {};

    // Visibility filter based on user role
    if (user.role !== UserRole.ADMIN) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (visibility) where.visibility = visibility;
    if (institutionId) where.institutionId = institutionId;
    if (boardId) where.boardId = boardId;
    if (groupId) where.groupId = groupId;
    if (creatorId) where.creatorId = creatorId;
    if (assigneeId) where.assigneeId = assigneeId;

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
      if (startDateTo) where.startDate.lte = new Date(startDateTo);
    }

    if (endDateFrom || endDateTo) {
      where.endDate = {};
      if (endDateFrom) where.endDate.gte = new Date(endDateFrom);
      if (endDateTo) where.endDate.lte = new Date(endDateTo);
    }

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (tags && tags.length > 0) where.tags = { hasSome: tags };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          creator: { select: userMinimalSelect },
          institution: true,
          board: true,
          group: true,
          assignee: { select: userMinimalSelect },
          _count: { select: { attendees: true, resources: true, tasks: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  async findById(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
        board: true,
        group: true,
        assignee: { select: userMinimalSelect },
        resources: true,
        tasks: true,
        attendees: { select: userMinimalSelect },
        eventDates: { include: { location: true, participants: { select: userMinimalSelect } } },
        pendingEventDates: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (!this.canViewEvent(event, user)) {
      throw new ForbiddenException('You do not have permission to view this event');
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const event = await this.findById(id, user);

    if (!this.canModifyEvent(event, user)) {
      throw new ForbiddenException('You do not have permission to modify this event');
    }

    const data: any = { ...updateEventDto };

    // Handle status changes
    if (updateEventDto.status && updateEventDto.status !== event.status) {
      if (updateEventDto.status === EventStatus.PUBLISHED && event.status !== EventStatus.PUBLISHED) {
        data.publishedAt = new Date();
      } else if (updateEventDto.status === EventStatus.CANCELLED && event.status !== EventStatus.CANCELLED) {
        data.cancelledAt = new Date();
        data.cancellationReason = updateEventDto.cancellationReason;
      }
    }

    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
        board: true,
        group: true,
      },
    });
  }

  async remove(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const event = await this.findById(id, user);

    if (!this.canModifyEvent(event, user)) {
      throw new ForbiddenException('You do not have permission to delete this event');
    }

    // Delete related data first (cascade not set on all relations)
    await Promise.all([
      this.prisma.eventDateData.deleteMany({ where: { eventId: id } }),
      this.prisma.eventDate.deleteMany({ where: { eventId: id } }),
      this.prisma.resource.deleteMany({ where: { eventId: id } }),
      this.prisma.task.deleteMany({ where: { eventId: id } }),
      this.prisma.file.deleteMany({ where: { eventId: id } }),
    ]);

    return this.prisma.event.delete({ where: { id } });
  }

  async attendEvent(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { attendees: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (event.attendees.some((a) => a.id === userId)) {
      throw new ForbiddenException('You are already attending this event');
    }

    if (event.maxAttendees > 0 && event.currentAttendees >= event.maxAttendees) {
      throw new ForbiddenException('Event is full');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        attendees: { connect: { id: userId } },
        currentAttendees: { increment: 1 },
      },
    });
  }

  async unattendEvent(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { attendees: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (!event.attendees.some((a) => a.id === userId)) {
      throw new ForbiddenException('You are not attending this event');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        attendees: { disconnect: { id: userId } },
        currentAttendees: { decrement: 1 },
      },
    });
  }

  async getUpcomingEvents(user: { id: string; role: UserRole; institutionId?: string | null }, limit = 10) {
    const where: any = {
      startDate: { gt: new Date() },
      status: EventStatus.PUBLISHED,
    };

    if (user.role !== UserRole.ADMIN) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    }

    return this.prisma.event.findMany({
      where,
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });
  }

  async getEventsByInterest(interests: string[], limit = 10) {
    if (!interests.length) return [];

    return this.prisma.event.findMany({
      where: {
        startDate: { gt: new Date() },
        status: EventStatus.PUBLISHED,
        tags: { hasSome: interests },
        OR: [
          { visibility: EventVisibility.PUBLIC },
        ],
      },
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });
  }

  async getSimilarEvents(eventId: string, limit = 5) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { tags: true, category: true, institutionId: true, groupId: true },
    });

    if (!event) return [];

    return this.prisma.event.findMany({
      where: {
        id: { not: eventId },
        status: EventStatus.PUBLISHED,
        OR: [
          { tags: { hasSome: event.tags } },
          { category: event.category },
          { institutionId: event.institutionId },
          { groupId: event.groupId },
        ],
      },
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });
  }

  private canViewEvent(event: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (event.creatorId === user.id) return true;
    if (event.visibility === EventVisibility.PUBLIC) return true;
    if (event.institutionId && event.institutionId === user.institutionId) return true;
    if (event.groupId && event.group?.members?.some((m: any) => m.id === user.id)) return true;
    return false;
  }

  private canModifyEvent(event: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (event.creatorId === user.id) return true;
    if (user.role === UserRole.INSTITUTIONAL_USER && event.institutionId === user.institutionId) return true;
    return false;
  }
}