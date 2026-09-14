import { Injectable } from '@nestjs/common';
import { Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PublicUser = Omit<User, 'password'>;

export type CreateUserInput = Pick<
  Prisma.UserCreateInput,
  'email' | 'name' | 'password' | 'role'
>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: CreateUserInput): Promise<PublicUser> {
    return this.prisma.user.create({ data, omit: { password: true } });
  }
}
