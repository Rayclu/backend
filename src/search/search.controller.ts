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
    @CurrentUser() user: CurrentUserInfo,
    @Query('q') query?: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ): Promise<SearchResult[]> {
    const q = (query ?? '').trim();
    const typeArray = types ? types.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

    // Una sola letra no es una búsqueda válida
    if (q.length === 1) return [];
    // Sin texto solo se permite listar (Discover), no la búsqueda global
    if (q.length === 0 && !typeArray) return [];

    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    return this.searchService.search(q, user, { types: typeArray, limit: parsedLimit });
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