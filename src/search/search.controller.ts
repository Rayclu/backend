import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService, SearchResult } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface CurrentUserInfo {
  id: string;
  role: UserRole;
  institutionId?: string | null;
}

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across all entities' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @CurrentUser() user: { id: string; role: UserRole; institutionId?: string | null },
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit: number = 20,
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const typeArray = types ? types.split(',') : undefined;
    return this.searchService.search(query.trim(), user, { types: typeArray, limit });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200, description: 'Search suggestions' })
  async getSuggestions(@Query('q') query: string): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const suggestions = [
      'conference',
      'workshop',
      'meeting',
      'networking',
      'tech',
      'marketing',
      'design',
      'development',
      'ai',
      'startup',
    ];

    return suggestions
      .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  }
}