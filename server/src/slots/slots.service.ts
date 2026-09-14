import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { ListSlotsQueryDto } from './dto/list-slots-query.dto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const now = new Date();

    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }
    if (startAt <= now) {
      throw new BadRequestException('Slot must start in the future');
    }

    return this.prisma.slot.create({ data: { providerId, startAt, endAt } });
  }

  async listAvailable(providerId: string, query: ListSlotsQueryDto) {
    const provider = await this.prisma.user.findFirst({
      where: { id: providerId, role: 'PROVIDER' },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const now = new Date();
    const from = query.from ? new Date(query.from) : now;
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + SEVEN_DAYS_MS);
    if (from >= to) throw new BadRequestException('from must be before to');

    return this.prisma.slot.findMany({
      where: {
        providerId,
        startAt: { gte: from > now ? from : now, lt: to },
        bookings: { none: { status: 'CONFIRMED' } },
      },
      orderBy: { startAt: 'asc' },
    });
  }
}
