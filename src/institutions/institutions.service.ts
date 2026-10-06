import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UserRole } from '@prisma/client';
import { userMinimalSelect } from '../common/prisma/selects';

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  async create(createInstitutionDto: CreateInstitutionDto, userId: string) {
    return this.prisma.institution.create({
      data: {
        ...createInstitutionDto,
        ownerId: userId,
        admins: { connect: [{ id: userId }] },
      },
      include: {
        owner: { select: userMinimalSelect },
        admins: { select: userMinimalSelect },
        users: { select: userMinimalSelect },
        _count: { select: { users: true, events: true, boards: true, groups: true } },
      },
    });
  }

  async findAll(user: { id: string; role: UserRole; institutionId?: string | null }) {
    const where: any = {};

    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { ownerId: user.id },
        { admins: { some: { id: user.id } } },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { id: user.institutionId },
        { ownerId: user.id },
        { admins: { some: { id: user.id } } },
      ];
    }

    return this.prisma.institution.findMany({
      where,
      include: {
        owner: { select: userMinimalSelect },
        admins: { select: userMinimalSelect },
        _count: { select: { users: true, events: true, boards: true, groups: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        owner: { select: userMinimalSelect },
        admins: { select: userMinimalSelect },
        users: { select: userMinimalSelect },
        events: true,
        boards: true,
        groups: true,
      },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    if (!this.canViewInstitution(institution, user)) {
      throw new ForbiddenException('You do not have permission to view this institution');
    }

    return institution;
  }

  async update(id: string, updateInstitutionDto: UpdateInstitutionDto, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const institution = await this.findById(id, user);

    if (!this.canModifyInstitution(institution, user)) {
      throw new ForbiddenException('You do not have permission to modify this institution');
    }

    return this.prisma.institution.update({
      where: { id },
      data: updateInstitutionDto,
      include: { owner: true, admins: true },
    });
  }

  async remove(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const institution = await this.findById(id, user);

    if (!this.canModifyInstitution(institution, user)) {
      throw new ForbiddenException('You do not have permission to delete this institution');
    }

    return this.prisma.institution.delete({ where: { id } });
  }

  async addAdmin(institutionId: string, userId: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const institution = await this.findById(institutionId, user);

    if (!this.canModifyInstitution(institution, user)) {
      throw new ForbiddenException('You do not have permission to add admins');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (institution.admins.some((a) => a.id === userId)) {
      return institution;
    }

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { admins: { connect: { id: userId } } },
      include: { admins: true },
    });
  }

  async removeAdmin(institutionId: string, userId: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const institution = await this.findById(institutionId, user);

    if (!this.canModifyInstitution(institution, user)) {
      throw new ForbiddenException('You do not have permission to remove admins');
    }

    if (institution.ownerId === userId) {
      throw new ForbiddenException('Cannot remove institution owner');
    }

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { admins: { disconnect: { id: userId } } },
      include: { admins: true },
    });
  }

  private canViewInstitution(institution: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (institution.ownerId === user.id) return true;
    if (institution.admins.some((a: any) => a.id === user.id)) return true;
    if (user.role === UserRole.INSTITUTIONAL_USER && institution.id === user.institutionId) return true;
    return false;
  }

  private canModifyInstitution(institution: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (institution.ownerId === user.id) return true;
    if (user.role === UserRole.INSTITUTIONAL_USER && institution.id === user.institutionId) return true;
    return false;
  }
}