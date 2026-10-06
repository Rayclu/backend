import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus, EventVisibility, UserRole } from '@prisma/client';
import { userMinimalSelect } from '../common/prisma/selects';

export interface RecommendationResult {
  event: any;
  score: number;
  reasons: string[];
}

@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  async getRecommendationsForUser(userId: string, limit = 10): Promise<RecommendationResult[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { institution: true },
    });

    if (!user) {
      return [];
    }

    // Get user's interests from attended events
    const attendedEvents = await this.prisma.event.findMany({
      where: {
        attendees: { some: { id: userId } },
        status: EventStatus.COMPLETED,
      },
      select: { id: true, tags: true, category: true },
    });

    // Extract interests from tags and categories
    const interests = new Set<string>();
    attendedEvents.forEach((event) => {
      if (event.tags) event.tags.forEach((tag) => interests.add(tag));
      interests.add(event.category);
    });

    // Get user's created events categories
    const createdEvents = await this.prisma.event.findMany({
      where: { creatorId: userId },
      select: { category: true, tags: true },
    });
    createdEvents.forEach((event) => {
      interests.add(event.category);
      if (event.tags) event.tags.forEach((tag) => interests.add(tag));
    });

    // Get events user might be interested in
    const interestArray = Array.from(interests);
    
    if (interestArray.length === 0) {
      // Fallback: return popular upcoming events
      return this.getPopularEvents(user, limit);
    }

    const where: any = {
      startDate: { gt: new Date() },
      status: EventStatus.PUBLISHED,
    };

    // Apply visibility
    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    }

    // Exclude already attended events
    const attendedIds = attendedEvents.map((e) => e.id);
    if (attendedIds.length > 0) {
      where.id = { notIn: attendedIds };
    }

    // Score events based on interests
    const events = await this.prisma.event.findMany({
      where,
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
      },
      orderBy: { startDate: 'asc' },
      take: limit * 3,
    });

    // Calculate scores
    const scoredEvents: RecommendationResult[] = events.map((event) => {
      let score = 0;
      const reasons: string[] = [];

      // Category match
      if (interests.has(event.category)) {
        score += 10;
        reasons.push(`Matches your interest in ${event.category}`);
      }

      // Tag matches
      if (event.tags) {
        const matchingTags = event.tags.filter((tag) => interests.has(tag));
        score += matchingTags.length * 5;
        if (matchingTags.length > 0) {
          reasons.push(`Matches tags: ${matchingTags.join(', ')}`);
        }
      }

      // Institution match
      if (event.institutionId && event.institutionId === user.institutionId) {
        score += 8;
        reasons.push('From your institution');
      }

      // Recency boost
      const daysUntilEvent = Math.ceil((event.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilEvent <= 7) {
        score += 5;
        reasons.push('Happening soon');
      }

      // Popularity boost
      if (event.currentAttendees > 0) {
        const fillRate = event.maxAttendees > 0 ? event.currentAttendees / event.maxAttendees : 0;
        if (fillRate > 0.5) {
          score += 3;
          reasons.push('Popular event');
        }
      }

      return { event, score, reasons };
    });

    // Sort by score and return top results
    return scoredEvents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getRecommendationsByInterest(interests: string[], user: { id: string; role: UserRole; institutionId?: string | null }, limit = 10): Promise<RecommendationResult[]> {
    const where: any = {
      startDate: { gt: new Date() },
      status: EventStatus.PUBLISHED,
    };

    // Apply visibility
    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    }

    if (interests.length > 0) {
      where.OR = [
        { category: { in: interests } },
        { tags: { hasSome: interests } },
      ];
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });

    return events.map((event) => ({
      event,
      score: 0,
      reasons: interests.length > 0 ? ['Matches your interests'] : [],
    }));
  }

  async getSimilarEvents(eventId: string, user: { id: string; role: UserRole; institutionId?: string | null }, limit = 5): Promise<RecommendationResult[]> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return [];

    const where: any = {
      id: { not: eventId },
      startDate: { gt: new Date() },
      status: EventStatus.PUBLISHED,
    };

    // Apply visibility
    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    }

    // Similar by category and tags
    where.OR = [
      { category: event.category },
      { tags: { hasSome: event.tags || [] } },
    ];

    const events = await this.prisma.event.findMany({
      where,
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });

    return events.map((e) => ({
      event: e,
      score: e.category === event.category ? 10 : 5,
      reasons: e.category === event.category ? ['Same category'] : ['Similar tags'],
    }));
  }

  private async getPopularEvents(user: { id: string; role: UserRole; institutionId?: string | null }, limit: number): Promise<RecommendationResult[]> {
    const where: any = {
      startDate: { gt: new Date() },
      status: EventStatus.PUBLISHED,
      maxAttendees: { gt: 0 },
      currentAttendees: { gt: 0 },
    };

    // Apply visibility
    if (user.role === UserRole.NORMAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    } else if (user.role === UserRole.INSTITUTIONAL_USER) {
      where.OR = [
        { visibility: EventVisibility.PUBLIC },
        { institutionId: user.institutionId },
        { group: { members: { some: { id: user.id } } } },
      ];
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        creator: { select: userMinimalSelect },
        institution: true,
      },
      orderBy: [
        { currentAttendees: 'desc' },
        { startDate: 'asc' },
      ],
      take: limit,
    });

    return events.map((event) => ({
      event,
      score: event.currentAttendees / event.maxAttendees,
      reasons: ['Popular event'],
    }));
  }
}