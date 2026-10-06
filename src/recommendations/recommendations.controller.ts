import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService, RecommendationResult } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get personalized recommendations' })
  @ApiResponse({ status: 200, description: 'Personalized recommendations' })
  async getRecommendations(
    @CurrentUser() user: CurrentUserInfo,
    @Query('limit') limit: number = 10,
  ): Promise<RecommendationResult[]> {
    return this.recommendationsService.getRecommendationsForUser(user.id, limit);
  }

  @Get('by-interest')
  @ApiOperation({ summary: 'Get recommendations by interests' })
  @ApiResponse({ status: 200, description: 'Recommendations by interest' })
  async getByInterest(
    @CurrentUser() user: CurrentUserInfo,
    @Query('interests') interests: string,
    @Query('limit') limit: number = 10,
  ): Promise<RecommendationResult[]> {
    const interestArray = interests ? interests.split(',') : [];
    return this.recommendationsService.getRecommendationsByInterest(interestArray, user, limit);
  }

  @Get('similar/:eventId')
  @ApiOperation({ summary: 'Get similar events' })
  @ApiResponse({ status: 200, description: 'Similar events' })
  async getSimilar(
    @CurrentUser() user: CurrentUserInfo,
    @Param('eventId') eventId: string,
    @Query('limit') limit: number = 5,
  ): Promise<RecommendationResult[]> {
    return this.recommendationsService.getSimilarEvents(eventId, user, limit);
  }
}