import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { UserRole } from '@prisma/client';
import { ResourceType } from '@prisma/client';
import { userMinimalSelect } from '../common/prisma/selects';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async create(createResourceDto: CreateResourceDto, userId: string, userInstitutionId?: string) {
    return this.prisma.resource.create({
      data: {
        ...createResourceDto,
        uploaderId: userId,
        institutionId: userInstitutionId,
      },
      include: { uploader: true, event: true },
    });
  }

  async findAll(user: { id: string; role: UserRole; institutionId?: string | null }, filters?: { type?: ResourceType; eventId?: string; boardId?: string; groupId?: string }) {
    const where: any = {};

    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { isPublic: true },
        { uploaderId: user.id },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { isPublic: true },
        { uploaderId: user.id },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    }

    if (filters?.type) where.type = filters.type;
    if (filters?.eventId) where.eventId = filters.eventId;
    if (filters?.boardId) where.boardId = filters.boardId;
    if (filters?.groupId) where.groupId = filters.groupId;

    return this.prisma.resource.findMany({
      where,
      include: {
        uploader: { select: userMinimalSelect },
        event: true,
        group: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: { select: userMinimalSelect },
        event: true,
        group: true,
      },
    });

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    if (!this.canViewResource(resource, user)) {
      throw new ForbiddenException('You do not have permission to view this resource');
    }

    return resource;
  }

  async update(id: string, updateResourceDto: UpdateResourceDto, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const resource = await this.findById(id, user);

    if (!this.canModifyResource(resource, user)) {
      throw new ForbiddenException('You do not have permission to modify this resource');
    }

    return this.prisma.resource.update({
      where: { id },
      data: updateResourceDto,
      include: { uploader: true, event: true },
    });
  }

  async remove(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const resource = await this.findById(id, user);

    if (!this.canModifyResource(resource, user)) {
      throw new ForbiddenException('You do not have permission to delete this resource');
    }

    return this.prisma.resource.delete({ where: { id } });
  }

  private canViewResource(resource: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (resource.uploaderId === user.id) return true;
    if (resource.isPublic) return true;
    if (resource.institutionId && resource.institutionId === user.institutionId) return true;
    if (resource.groupId && resource.group?.members?.some((m: any) => m.id === user.id)) return true;
    return false;
  }

  private canModifyResource(resource: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (resource.uploaderId === user.id) return true;
    return false;
  }
}