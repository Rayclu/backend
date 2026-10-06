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
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('institutions')
@Controller('institutions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new institution' })
  @ApiResponse({ status: 201, description: 'Institution created successfully' })
  async create(@Body() createInstitutionDto: CreateInstitutionDto, @CurrentUser() user: CurrentUserInfo) {
    return this.institutionsService.create(createInstitutionDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all institutions' })
  @ApiResponse({ status: 200, description: 'List of institutions' })
  async findAll(@CurrentUser() user: CurrentUserInfo) {
    return this.institutionsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get institution by ID' })
  @ApiResponse({ status: 200, description: 'Institution found' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.institutionsService.findById(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update institution' })
  @ApiResponse({ status: 200, description: 'Institution updated' })
  async update(@Param('id') id: string, @Body() updateInstitutionDto: UpdateInstitutionDto, @CurrentUser() user: CurrentUserInfo) {
    return this.institutionsService.update(id, updateInstitutionDto, user);
  }

  @Post(':id/admins/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add admin to institution' })
  @ApiResponse({ status: 200, description: 'Admin added' })
  async addAdmin(@Param('id') institutionId: string, @Param('userId') userId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.institutionsService.addAdmin(institutionId, userId, user);
  }

  @Delete(':id/admins/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove admin from institution' })
  @ApiResponse({ status: 200, description: 'Admin removed' })
  async removeAdmin(@Param('id') institutionId: string, @Param('userId') userId: string, @CurrentUser() user: CurrentUserInfo) {
    return this.institutionsService.removeAdmin(institutionId, userId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete institution' })
  @ApiResponse({ status: 200, description: 'Institution deleted' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    await this.institutionsService.remove(id, user);
    return { message: 'Institution deleted successfully' };
  }
}