import { Injectable } from '@nestjs/common';
import { ADDRESS } from '@ptg/config';
import type { AddressDto, AddressInput, AuthenticatedUser } from '@ptg/types';
import { AUDIT_ACTIONS } from '@ptg/config';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { PasswordService } from '../auth/password.service.js';
import type {
  PaginationQueryDto} from '../../common/dto/pagination.dto.js';
import {
  buildPaginationMeta,
  paginationArgs,
  type PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { toAuthenticatedUser } from './user.mapper.js';
import type { AdminUserDto } from '@ptg/types';
import type { CreateUserDto, UpdateUserDto } from './users.dto.js';

/** `AddressInput` with the two genuinely-optional fields relaxed to accept `undefined` from a class-validator DTO, not just `null`. */
type LooseAddressInput = Omit<AddressInput, 'district' | 'postalCode' | 'isDefault'> & {
  district?: string | null;
  postalCode?: string | null;
  isDefault?: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
    private readonly password: PasswordService,
  ) {}

  async getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { partnerProfile: true },
    });
    const [{ roles, permissions }, sponsorRelationship] = await Promise.all([
      this.rbac.resolveForUser(userId),
      this.prisma.sponsorRelationship.findUnique({
        where: { memberId: userId },
        include: { sponsor: { select: { memberId: true } } },
      }),
    ]);
    return toAuthenticatedUser({
      user,
      partnerProfile: user.partnerProfile,
      sponsorMemberId: sponsorRelationship?.sponsor?.memberId ?? null,
      roles,
      permissions,
    });
  }

  async updateProfile(
    userId: string,
    dto: { fullName?: string; displayName?: string; phone?: string; locale?: string; avatarUrl?: string | null },
  ): Promise<AuthenticatedUser> {
    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing && existing.id !== userId) throw new ApiException('PHONE_TAKEN', 'This phone number is already in use.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        displayName: dto.displayName,
        phone: dto.phone,
        locale: dto.locale,
        avatarUrl: dto.avatarUrl,
      },
    });
    return this.getAuthenticatedUser(userId);
  }

  // --- addresses -------------------------------------------------------------

  async listAddresses(userId: string): Promise<AddressDto[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return addresses.map(toAddressDto);
  }

  async createAddress(userId: string, input: LooseAddressInput): Promise<AddressDto> {
    const count = await this.prisma.address.count({ where: { userId } });
    if (count >= ADDRESS.maxPerUser) {
      throw new ApiException('ADDRESS_LIMIT_REACHED', `You can save at most ${ADDRESS.maxPerUser} addresses.`);
    }

    const makeDefault = input.isDefault || count === 0;
    const address = await this.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: { ...input, district: input.district ?? null, postalCode: input.postalCode ?? null, userId, isDefault: makeDefault },
      });
    });
    return toAddressDto(address);
  }

  async updateAddress(userId: string, addressId: string, input: Partial<LooseAddressInput>): Promise<AddressDto> {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.userId !== userId) throw new ApiException('ADDRESS_NOT_FOUND', 'Address not found.');

    const address = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id: addressId }, data: input });
    });
    return toAddressDto(address);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.userId !== userId) throw new ApiException('ADDRESS_NOT_FOUND', 'Address not found.');
    await this.prisma.address.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await this.prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (next) await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<AddressDto> {
    return this.updateAddress(userId, addressId, { isDefault: true });
  }

  // --- admin user management --------------------------------------------------

  async adminListUsers(query: PaginationQueryDto & { status?: string; role?: string }): Promise<PaginatedResult<AdminUserDto>> {
    const where = {
      status: query.status as never,
      roles: query.role ? { some: { role: { name: query.role as never } } } : undefined,
      OR: query.search
        ? [
            { fullName: { contains: query.search, mode: 'insensitive' as const } },
            { memberId: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { roles: { include: { role: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    const items: AdminUserDto[] = rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      status: row.status,
      roles: row.roles.map((r) => r.role.name),
      locale: row.locale as AdminUserDto['locale'],
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
    return { items, pagination: buildPaginationMeta(query, total) };
  }

  async adminCreateUser(actorId: string, dto: CreateUserDto): Promise<AdminUserDto> {
    const [memberIdTaken, emailTaken, phoneTaken] = await Promise.all([
      this.prisma.user.findUnique({ where: { memberId: dto.memberId } }),
      dto.email ? this.prisma.user.findUnique({ where: { email: dto.email } }) : null,
      dto.phone ? this.prisma.user.findUnique({ where: { phone: dto.phone } }) : null,
    ]);
    if (memberIdTaken) throw new ApiException('MEMBER_ID_TAKEN', 'This member ID is already in use.');
    if (emailTaken) throw new ApiException('EMAIL_TAKEN', 'This email is already in use.');
    if (phoneTaken) throw new ApiException('PHONE_TAKEN', 'This phone number is already in use.');

    this.password.assertPolicy(dto.password);
    const passwordHash = await this.password.hash(dto.password);

    const roles = await this.prisma.role.findMany({ where: { name: { in: dto.roles } } });

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          memberId: dto.memberId,
          fullName: dto.fullName,
          displayName: dto.fullName,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          passwordHash,
          locale: dto.locale ?? 'en',
          roles: { create: roles.map((role) => ({ roleId: role.id })) },
        },
        include: { roles: { include: { role: true } } },
      });

      if (dto.roles.includes('PARTNER')) {
        await tx.partnerProfile.create({
          data: { userId: created.id, membershipStatus: 'ACTIVE', joinedAt: new Date() },
        });
      }
      return created;
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.userCreated,
      entityType: 'User',
      entityId: user.id,
      after: { memberId: user.memberId, roles: dto.roles },
    });

    return {
      id: user.id,
      memberId: user.memberId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles: user.roles.map((r) => r.role.name),
      locale: user.locale as AdminUserDto['locale'],
      lastLoginAt: null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async adminUpdateUser(actorId: string, userId: string, dto: UpdateUserDto): Promise<AdminUserDto> {
    const before = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!before) throw new ApiException('USER_NOT_FOUND', 'User not found.');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          status: dto.status as never,
          locale: dto.locale,
        },
      });

      if (dto.roles) {
        const roles = await tx.role.findMany({ where: { name: { in: dto.roles } } });
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.createMany({ data: roles.map((role) => ({ userId, roleId: role.id })) });
      }
    });

    await this.rbac.invalidate(userId);

    const after = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { include: { role: true } } } });

    await this.audit.record({
      actorId,
      action: dto.roles ? AUDIT_ACTIONS.userRolesChanged : AUDIT_ACTIONS.userUpdated,
      entityType: 'User',
      entityId: userId,
      before: { status: before.status, roles: before.roles.map((r) => r.role.name) },
      after: { status: after.status, roles: after.roles.map((r) => r.role.name) },
    });

    return {
      id: after.id,
      memberId: after.memberId,
      fullName: after.fullName,
      email: after.email,
      phone: after.phone,
      status: after.status,
      roles: after.roles.map((r) => r.role.name),
      locale: after.locale as AdminUserDto['locale'],
      lastLoginAt: after.lastLoginAt?.toISOString() ?? null,
      createdAt: after.createdAt.toISOString(),
    };
  }
}

function toAddressDto(address: {
  id: string;
  recipientName: string;
  phone: string;
  country: string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AddressDto {
  return {
    id: address.id,
    recipientName: address.recipientName,
    phone: address.phone,
    country: address.country,
    region: address.region,
    city: address.city,
    district: address.district,
    street: address.street,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString(),
  };
}
