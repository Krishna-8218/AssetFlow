import { prisma } from './prisma';

export async function createNotification({
  userId,
  title,
  message,
  type,
  referenceId,
  referenceType,
}: {
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  referenceType?: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      referenceId,
      referenceType,
    },
  });
}

export async function createBulkNotifications(
  userIds: string[],
  data: {
    title: string;
    message: string;
    type: string;
    referenceId?: string;
    referenceType?: string;
  }
) {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      ...data,
    })),
  });
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
