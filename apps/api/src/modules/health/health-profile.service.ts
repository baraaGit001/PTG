import { Injectable } from '@nestjs/common';
import type { HealthProfileDto, UpdateHealthProfileRequest } from '@ptg/types';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * A simple, non-diagnostic form-card profile (height/weight/goal). No
 * medical assessment, score, or recommendation is derived from it here.
 */
@Injectable()
export class HealthProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<HealthProfileDto> {
    const profile = await this.prisma.healthProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.toDto(profile);
  }

  async update(userId: string, dto: UpdateHealthProfileRequest): Promise<HealthProfileDto> {
    const profile = await this.prisma.healthProfile.upsert({
      where: { userId },
      create: {
        userId,
        gender: dto.gender,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        heightCm: dto.heightCm ?? undefined,
        weightGrams: dto.weightGrams ?? undefined,
        activityLevel: dto.activityLevel,
        goal: dto.goal,
        targetWeightGrams: dto.targetWeightGrams ?? undefined,
        notes: dto.notes ?? undefined,
      },
      update: {
        gender: dto.gender,
        birthDate: dto.birthDate === null ? null : dto.birthDate ? new Date(dto.birthDate) : undefined,
        heightCm: dto.heightCm,
        weightGrams: dto.weightGrams,
        activityLevel: dto.activityLevel,
        goal: dto.goal,
        targetWeightGrams: dto.targetWeightGrams,
        notes: dto.notes,
      },
    });
    return this.toDto(profile);
  }

  private toDto(profile: {
    userId: string; gender: string; birthDate: Date | null; heightCm: number | null; weightGrams: number | null; activityLevel: string; goal: string; targetWeightGrams: number | null; notes: string | null; updatedAt: Date;
  }): HealthProfileDto {
    return {
      id: profile.userId,
      gender: profile.gender as HealthProfileDto['gender'],
      birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
      heightCm: profile.heightCm,
      weightGrams: profile.weightGrams,
      activityLevel: profile.activityLevel as HealthProfileDto['activityLevel'],
      goal: profile.goal as HealthProfileDto['goal'],
      targetWeightGrams: profile.targetWeightGrams,
      notes: profile.notes,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
