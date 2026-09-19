import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Slot } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../shared/pagination';
import { PaginationQueryDto } from '../shared/pagination.dto';
import { ProviderBookingsQueryDto } from './dto/provider-bookings-query.dto';

const ALREADY_CANCELLED = 'Booking is already cancelled';

const bookingInclude = {
  slot: { include: { provider: { select: { id: true, name: true } } } },
} satisfies Prisma.BookingInclude;

type BookingWithSlot = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) { }

  create(clientId: string, slotIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM slots WHERE id = ANY(${slotIds}::uuid[]) FOR SHARE`;

      const slots = await tx.slot.findMany({
        where: { id: { in: slotIds } },
        orderBy: { startAt: 'asc' },
      });
      this.assertBookable(slots, slotIds);

      const bookings: BookingWithSlot[] = [];
      for (const slot of slots) {
        bookings.push(
          await tx.booking.create({
            data: { slotId: slot.id, clientId },
            include: bookingInclude,
          }),
        );
      }
      return bookings;
    });
  }

  listMine(clientId: string, query: PaginationQueryDto) {
    return paginate(query, (page) =>
      this.prisma.booking.findMany({
        where: { clientId },
        include: bookingInclude,
        orderBy: { slot: { startAt: 'asc' } },
        ...page,
      }),
    );
  }

  listForProvider(providerId: string, query: ProviderBookingsQueryDto) {
    return paginate(query, (page) =>
      this.prisma.booking.findMany({
        where: {
          slot: { providerId },
          client: query.search
            ? { name: { contains: query.search, mode: 'insensitive' } }
            : undefined,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          cancelledAt: true,
          slot: { select: { id: true, startAt: true, endAt: true } },
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { slot: { startAt: 'asc' } },
        ...page,
      }),
    );
  }


  async cancel(clientId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { select: { startAt: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }
    if (booking.status === 'CANCELLED') {
      throw new ConflictException(ALREADY_CANCELLED);
    }
    if (booking.slot.startAt <= new Date()) {
      throw new BadRequestException('Past bookings cannot be cancelled');
    }

    try {
      return await this.prisma.booking.update({
        where: { id: bookingId, status: 'CONFIRMED' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: bookingInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(ALREADY_CANCELLED);
      }
      throw error;
    }
  }

  private assertBookable(slots: Slot[], slotIds: string[]): void {
    if (slots.length !== slotIds.length) {
      throw new NotFoundException('One or more slots not found');
    }
    if (slots[0].startAt <= new Date()) {
      throw new BadRequestException('Cannot book a slot in the past');
    }
    if (new Set(slots.map((s) => s.providerId)).size > 1) {
      throw new BadRequestException(
        'All slots must belong to the same provider',
      );
    }
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].startAt.getTime() !== slots[i - 1].endAt.getTime()) {
        throw new BadRequestException('Slots must be consecutive');
      }
    }
  }
}
