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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events with filters' })
  @ApiResponse({ status: 200, description: 'List of events' })
  async findAll(@Query() query: EventQueryDto, @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.findAll(query, user);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiResponse({ status: 200, description: 'Upcoming events' })
  async getUpcoming(@Query('limit') limit: number = 10, @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.getUpcomingEvents(user, limit);
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get recommended events based on interests' })
  @ApiResponse({ status: 200, description: 'Recommended events' })
  async getRecommended(@Query('interests') interests: string[], @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.getEventsByInterest(interests);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event found' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.findById(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update event' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.update(id, updateEventDto, user);
  }

  @Post(':id/attend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Attend an event' })
  @ApiResponse({ status: 200, description: 'Successfully attending event' })
  async attend(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.attendEvent(id, user.id);
  }

  @Post(':id/unattend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unattend an event' })
  @ApiResponse({ status: 200, description: 'Successfully unattended event' })
  async unattend(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    return this.eventsService.unattendEvent(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete event' })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserInfo) {
    await this.eventsService.remove(id, user);
    return { message: 'Event deleted successfully' };
  }
}