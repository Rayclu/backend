import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('boards')
@Controller('boards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new board' })
  @ApiResponse({ status: 201, description: 'Board created successfully' })
  async create(@Body() createBoardDto: CreateBoardDto, @CurrentUser() user: CurrentUserInfo) {
    return this.boardsService.create(createBoardDto, user.id, user.role, user.institutionId ?? undefined);
  }

  @Get()
  @ApiOperation({ summary: 'Get all boards' })
  @ApiResponse({ status: 200, description: 'List of boards' })
  async findAll(@CurrentUser() user: CurrentUserInfo) {
    return this.boardsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get board by ID' })
  @ApiResponse({ status: 200, description: 'Board found' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.boardsService.findById(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update board' })
  @ApiResponse({ status: 200, description: 'Board updated' })
  async update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto, @CurrentUser() user: CurrentUserInfo) {
    return this.boardsService.update(id, updateBoardDto, user);
  }

  @Post(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add member to board' })
  @ApiResponse({ status: 200, description: 'Member added' })
  async addMember(@Param('id') boardId: string, @Param('userId') userId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.boardsService.addMember(boardId, userId, user);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from board' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(@Param('id') boardId: string, @Param('userId') userId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.boardsService.removeMember(boardId, userId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete board' })
  @ApiResponse({ status: 200, description: 'Board deleted' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    await this.boardsService.remove(id, user);
    return { message: 'Board deleted successfully' };
  }
}