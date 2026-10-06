import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: CurrentUserInfo) {
    return this.tasksService.create(createTaskDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filters' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('eventId') eventId?: string,
    @Query('boardId') boardId?: string,
  ) {
    return this.tasksService.findAll(user, { status, assigneeId, eventId, boardId });
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get my assigned tasks' })
  @ApiResponse({ status: 200, description: 'My tasks' })
  async getMyTasks(@CurrentUser() user: CurrentUserInfo) {
    return this.tasksService.getMyTasks(user);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming tasks' })
  @ApiResponse({ status: 200, description: 'Upcoming tasks' })
  async getUpcoming(@CurrentUser() user: CurrentUserInfo, @Query('days') days: number = 7) {
    return this.tasksService.getUpcomingTasks(user, days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task found' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.tasksService.findById(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @CurrentUser() user: CurrentUserInfo) {
    return this.tasksService.update(id, updateTaskDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    await this.tasksService.remove(id, user);
    return { message: 'Task deleted successfully' };
  }
}