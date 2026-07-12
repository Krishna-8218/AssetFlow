import { prisma } from './prisma';

export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  previousValue,
  newValue,
  role,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  role: string;
}) {
  return prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      role,
    },
  });
}
