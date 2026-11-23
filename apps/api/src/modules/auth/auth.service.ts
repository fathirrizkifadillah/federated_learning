import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { ENV } from '../../config/env';

export class AuthService {
  static async register(email: string, username: string, passwordPlain: string) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username';
      throw { statusCode: 400, code: 'USER_EXISTS', message: `${field} is already registered.` };
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        profile: {
          create: {
            displayName: username,
            onboardingCompleted: false,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.createdAt.toISOString(),
      },
      profile: {
        user_id: user.profile!.userId,
        display_name: user.profile!.displayName,
        bio: user.profile!.bio,
        avatar_url: user.profile!.avatarUrl,
        onboarding_completed: user.profile!.onboardingCompleted,
      },
      token,
    };
  }

  static async login(email: string, passwordPlain: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.createdAt.toISOString(),
      },
      profile: {
        user_id: user.profile?.userId || user.id,
        display_name: user.profile?.displayName || user.username,
        bio: user.profile?.bio || null,
        avatar_url: user.profile?.avatarUrl || null,
        onboarding_completed: user.profile?.onboardingCompleted || false,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.createdAt.toISOString(),
      },
      profile: {
        user_id: user.profile?.userId || user.id,
        display_name: user.profile?.displayName || user.username,
        bio: user.profile?.bio || null,
        avatar_url: user.profile?.avatarUrl || null,
        onboarding_completed: user.profile?.onboardingCompleted || false,
      },
    };
  }

  static async updateProfile(userId: string, data: { displayName?: string; bio?: string }) {
    const updated = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        displayName: data.displayName,
        bio: data.bio,
      },
      create: {
        userId,
        displayName: data.displayName,
        bio: data.bio,
      },
    });

    return {
      user_id: updated.userId,
      display_name: updated.displayName,
      bio: updated.bio,
      avatar_url: updated.avatarUrl,
    };
  }

  static async changePassword(userId: string, currentPlain: string, newPlain: string) {
    if (!newPlain || newPlain.length < 6) {
      throw { statusCode: 400, code: 'PASSWORD_TOO_SHORT', message: 'New password must be at least 6 characters.' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
    }

    const isValid = await bcrypt.compare(currentPlain, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 400, code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect.' };
    }

    const newHash = await bcrypt.hash(newPlain, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Password updated successfully.' };
  }
}
