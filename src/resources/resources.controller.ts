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
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('resources')
@Controller('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  async create(@Body() createResourceDto: CreateResourceDto, @CurrentUser() user: CurrentUserInfo) {
    return this.resourcesService.create(createResourceDto, user.id, user.institutionId ?? undefined);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources with filters' })
  @ApiResponse({ status: 200, description: 'List of resources' })
  async findAll(
    @CurrentUser() user: CurrentUserInfo,
    @Query('type') type?: ResourceType,
    @Query('eventId') eventId?: string,
    @Query('boardId') boardId?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.resourcesService.findAll(user, { type, eventId, boardId, groupId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiResponse({ status: 200, description: 'Resource found' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.resourcesService.findById(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resource' })
  @ApiResponse({ status: 200, description: 'Resource updated' })
  async update(@Param('id') id: string, @Body() updateResourceDto: UpdateResourceDto, @CurrentUser() user: CurrentUserInfo) {
    return this.resourcesService.update(id, updateResourceDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete resource' })
  @ApiResponse({ status: 200, description: 'Resource deleted' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    await this.resourcesService.remove(id, user);
    return { message: 'Resource deleted successfully' };
  }
}