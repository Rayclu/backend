import { EventStatus } from '@prisma/client';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EventsService', () => {
  it('publishes new events by default so they appear in the frontend panels', async () => {
    const prisma = {
      event: {
        create: jest.fn().mockResolvedValue({ id: 'evt_123' }),
      },
    } as unknown as PrismaService;

    const service = new EventsService(prisma);

    await service.create(
      {
        title: 'Demo event',
        startDate: '2026-10-08T18:00:00.000Z',
        endDate: '2026-10-08T20:00:00.000Z',
        tags: ['tech'],
      } as any,
      'user_123',
    );

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Demo event',
          creatorId: 'user_123',
          status: EventStatus.PUBLISHED,
          tags: ['tech'],
        }),
      }),
    );
  });
});
