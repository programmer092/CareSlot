import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const bookingInclude = {
  slot: { include: { provider: { select: { id: true, name: true } } } },
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, slotIds: string[]) {
    const slots = await this.prisma.slot.findMany({
      where: { id: { in: slotIds } },
      orderBy: { startAt: 'asc' },
    });
    if (slots.length !== slotIds.length) {
      throw new NotFoundException('One or more slots not found');
    }

    const now = new Date();
    if (slots[0].startAt <= now) {
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

    return this.prisma.$transaction(
      slots.map((slot) =>
        this.prisma.booking.create({
          data: { slotId: slot.id, clientId },
          include: bookingInclude,
        }),
      ),
    );
  }

  listMine(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: bookingInclude,
      orderBy: { slot: { startAt: 'asc' } },
    });
  }

  listForProvider(providerId: string) {
    return this.prisma.booking.findMany({
      where: { slot: { providerId } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        cancelledAt: true,
        slot: { select: { id: true, startAt: true, endAt: true } },
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { slot: { startAt: 'asc' } },
    });
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
      throw new ConflictException('Booking is already cancelled');
    }
    if (booking.slot.startAt <= new Date()) {
      throw new BadRequestException('Past bookings cannot be cancelled');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: bookingInclude,
    });
  }
}
