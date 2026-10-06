import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UserRole } from '@prisma/client';
import { userMinimalSelect } from '../common/prisma/selects';

const boardMemberSelect = {
  ...userMinimalSelect,
} as const;

@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  async create(createBoardDto: CreateBoardDto, userId: string, userRole: UserRole, userInstitutionId?: string) {
    const board = await this.prisma.board.create({
      data: {
        ...createBoardDto,
        ownerId: userId,
        institutionId: userRole === UserRole.INSTITUTIONAL_USER ? userInstitutionId : createBoardDto.institutionId,
        members: { connect: [{ id: userId }] },
      },
      include: {
        owner: { select: userMinimalSelect },
        institution: true,
        members: { select: userMinimalSelect },
        events: true,
      },
    });

    return board;
  }

  async findAll(user: { id: string; role: UserRole; institutionId?: string | null }) {
    const where: any = {};

    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { isPublic: true },
        { ownerId: user.id },
        { members: { some: { id: user.id } } },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { isPublic: true },
        { ownerId: user.id },
        { institutionId: user.institutionId },
        { members: { some: { id: user.id } } },
      ];
    }

    return this.prisma.board.findMany({
      where,
      include: {
        owner: { select: userMinimalSelect },
        institution: true,
        members: { select: userMinimalSelect },
        events: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        owner: { select: userMinimalSelect },
        institution: true,
        members: { select: userMinimalSelect },
        events: true,
      },
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    if (!this.canViewBoard(board, user)) {
      throw new ForbiddenException('You do not have permission to view this board');
    }

    return board;
  }

  async update(id: string, updateBoardDto: UpdateBoardDto, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const board = await this.findById(id, user);

    if (!this.canModifyBoard(board, user)) {
      throw new ForbiddenException('You do not have permission to modify this board');
    }

    return this.prisma.board.update({
      where: { id },
      data: updateBoardDto,
      include: { owner: true, institution: true, members: true, events: true },
    });
  }

  async remove(id: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const board = await this.findById(id, user);

    if (!this.canModifyBoard(board, user)) {
      throw new ForbiddenException('You do not have permission to delete this board');
    }

    return this.prisma.board.delete({ where: { id } });
  }

  async addMember(boardId: string, userId: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const board = await this.findById(boardId, user);

    if (!this.canModifyBoard(board, user)) {
      throw new ForbiddenException('You do not have permission to add members');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (board.members.some((m) => m.id === userId)) {
      return board;
    }

    return this.prisma.board.update({
      where: { id: boardId },
      data: { members: { connect: { id: userId } } },
      include: { members: { select: userMinimalSelect } },
    });
  }

  async removeMember(boardId: string, userId: string, user: { id: string; role: UserRole; institutionId?: string | null }) {
    const board = await this.findById(boardId, user);

    if (!this.canModifyBoard(board, user)) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    if (board.ownerId === userId) {
      throw new ForbiddenException('Cannot remove board owner');
    }

    return this.prisma.board.update({
      where: { id: boardId },
      data: { members: { disconnect: { id: userId } } },
      include: { members: { select: userMinimalSelect } },
    });
  }

  private canViewBoard(board: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (board.ownerId === user.id) return true;
    if (board.isPublic) return true;
    if (board.members.some((m: any) => m.id === user.id)) return true;
    if (user.role === UserRole.INSTITUTIONAL_USER && board.institutionId === user.institutionId) return true;
    return false;
  }

  private canModifyBoard(board: any, user: { id: string; role: UserRole; institutionId?: string | null }): boolean {
    if (user.role === UserRole.ADMIN) return true;
    if (board.ownerId === user.id) return true;
    if (user.role === UserRole.INSTITUTIONAL_USER && board.institutionId === user.institutionId) return true;
    return false;
  }
}