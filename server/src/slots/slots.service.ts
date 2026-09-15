import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { ListSlotsQueryDto } from './dto/list-slots-query.dto';

const MIN_SLOT_MINUTES = 30;
const MAX_SLOT_MINUTES = 60;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const activeBookingInclude = {
  bookings: {
    where: { status: 'CONFIRMED' as const },
    select: {
      id: true,
      client: { select: { id: true, name: true, email: true } },
    },
  },
};

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  listProviders() {
    return this.prisma.user.findMany({
      where: { role: 'PROVIDER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  create(providerId: string, dto: CreateSlotDto) {
    return this.prisma.slot.create({
      data: { providerId, ...this.parseTimes(dto) },
    });
  }

  async listMine(providerId: string, query: ListSlotsQueryDto) {
    const { from, to } = this.parseRange(query);
    const slots = await this.prisma.slot.findMany({
      where: { providerId, startAt: { gte: from, lt: to } },
      include: activeBookingInclude,
      orderBy: { startAt: 'asc' },
    });
    return slots.map(({ bookings, ...slot }) => ({
      ...slot,
      booking: bookings[0] ?? null,
    }));
  }

  async update(providerId: string, slotId: string, dto: CreateSlotDto) {
    await this.findOwnedAndFree(providerId, slotId);
    return this.prisma.slot.update({
      where: { id: slotId },
      data: this.parseTimes(dto),
    });
  }

  async remove(providerId: string, slotId: string): Promise<void> {
    await this.findOwnedAndFree(providerId, slotId);
    await this.prisma.$transaction([
      this.prisma.booking.deleteMany({
        where: { slotId, status: 'CANCELLED' },
      }),
      this.prisma.slot.delete({ where: { id: slotId } }),
    ]);
  }

  async listAvailable(providerId: string, query: ListSlotsQueryDto) {
    const provider = await this.prisma.user.findFirst({
      where: { id: providerId, role: 'PROVIDER' },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const now = new Date();
    const { from, to } = this.parseRange(query);
    return this.prisma.slot.findMany({
      where: {
        providerId,
        startAt: { gte: from > now ? from : now, lt: to },
        bookings: { none: { status: 'CONFIRMED' } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  private parseTimes(dto: CreateSlotDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }
    if (startAt <= new Date()) {
      throw new BadRequestException('Slot must start in the future');
    }
    const minutes = (endAt.getTime() - startAt.getTime()) / 60_000;
    if (minutes < MIN_SLOT_MINUTES || minutes > MAX_SLOT_MINUTES) {
      throw new BadRequestException(
        `Slot length must be between ${MIN_SLOT_MINUTES} and ${MAX_SLOT_MINUTES} minutes`,
      );
    }
    return { startAt, endAt };
  }

  private parseRange(query: ListSlotsQueryDto) {
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + SEVEN_DAYS_MS);
    if (from >= to) throw new BadRequestException('from must be before to');
    return { from, to };
  }

  private async findOwnedAndFree(providerId: string, slotId: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: activeBookingInclude,
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.providerId !== providerId) {
      throw new ForbiddenException('You can only manage your own slots');
    }
    if (slot.startAt <= new Date()) {
      throw new BadRequestException('Past slots cannot be changed');
    }
    if (slot.bookings.length > 0) {
      throw new ConflictException('Slot has a confirmed booking');
    }
    return slot;
  }
}
