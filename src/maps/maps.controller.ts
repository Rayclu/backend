import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MapsService, Location, RouteResult, NearbyEventsResult } from './maps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('maps')
@Controller('maps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('nearby-events')
  @ApiOperation({ summary: 'Get nearby events' })
  @ApiResponse({ status: 200, description: 'Nearby events with distances' })
  async getNearbyEvents(
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
    @Query('radius') radiusKm: number = 10,
    @Query('limit') limit: number = 20,
  ): Promise<NearbyEventsResult> {
    return this.mapsService.getNearbyEvents(latitude, longitude, radiusKm, limit);
  }

  @Get('route')
  @ApiOperation({ summary: 'Get route between two points' })
  @ApiResponse({ status: 200, description: 'Route information' })
  async getRoute(
    @Query('originLat') originLat: number,
    @Query('originLng') originLng: number,
    @Query('destLat') destLat: number,
    @Query('destLng') destLng: number,
    @Query('mode') mode: 'driving' | 'walking' | 'cycling' | 'transit' = 'driving',
  ): Promise<RouteResult> {
    const origin: Location = { latitude: originLat, longitude: originLng };
    const destination: Location = { latitude: destLat, longitude: destLng };
    return this.mapsService.getRoute(origin, destination, mode);
  }

  @Post('multi-stop-route')
  @ApiOperation({ summary: 'Get optimized multi-stop route' })
  @ApiResponse({ status: 200, description: 'Multi-stop route' })
  async getMultiStopRoute(
    @Body() locations: Location[],
    @Query('mode') mode: 'driving' | 'walking' | 'cycling' = 'driving',
    @Query('optimize') optimize: boolean = true,
  ): Promise<RouteResult> {
    return this.mapsService.getMultiStopRoute(locations, mode, optimize);
  }

  @Get('event-directions/:eventId')
  @ApiOperation({ summary: 'Get directions to event' })
  @ApiResponse({ status: 200, description: 'Directions to event' })
  async getEventDirections(
    @Param('eventId') eventId: string,
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
  ): Promise<RouteResult | null> {
    const userLocation: Location = { latitude, longitude };
    return this.mapsService.getEventDirections(eventId, userLocation);
  }

  @Get('public-transport')
  @ApiOperation({ summary: 'Get public transport options' })
  @ApiResponse({ status: 200, description: 'Public transport routes' })
  async getPublicTransport(
    @Query('originLat') originLat: number,
    @Query('originLng') originLng: number,
    @Query('destLat') destLat: number,
    @Query('destLng') destLng: number,
  ) {
    const origin: Location = { latitude: originLat, longitude: originLng };
    const destination: Location = { latitude: destLat, longitude: destLng };
    return this.mapsService.getPublicTransportInfo(origin, destination);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get map configuration' })
  @ApiResponse({ status: 200, description: 'Map configuration' })
  async getMapConfig() {
    return this.mapsService.getMapConfig();
  }
}