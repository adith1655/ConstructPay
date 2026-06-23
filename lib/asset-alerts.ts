import { prisma } from "./prisma";
import { NOTIFICATION_TYPE } from "./constants";
import { notifyUser } from "./assets";

const IDLE_DAYS = 90;
const LOW_COST_THRESHOLD = 1000;

export async function evaluateAssetAlerts(assetId: string) {
  const asset = await prisma.fixedAsset.findUnique({
    where: { id: assetId },
    include: {
      jobSite: {
        include: {
          assignments: {
            where: { user: { role: "SITE_MANAGER", active: true } },
            include: { user: true },
          },
        },
      },
    },
  });
  if (!asset || asset.retiredAt) return;

  const alerts: { title: string; body: string }[] = [];
  const now = new Date();

  if (asset.maintenanceDueDate) {
    if (asset.maintenanceDueDate < now) {
      alerts.push({
        title: `Maintenance overdue: ${asset.assetTagId}`,
        body: `${asset.description} — maintenance was due ${asset.maintenanceDueDate.toLocaleDateString("en-IN")}.`,
      });
    } else {
      const days = (asset.maintenanceDueDate.getTime() - now.getTime()) / 86400000;
      if (days <= 14) {
        alerts.push({
          title: `Maintenance due soon: ${asset.assetTagId}`,
          body: `${asset.description} — due in ${Math.ceil(days)} days.`,
        });
      }
    }
  }

  if (asset.warrantyExpiryDate) {
    const days = (asset.warrantyExpiryDate.getTime() - now.getTime()) / 86400000;
    if (days <= 30 && days >= 0) {
      alerts.push({
        title: `Warranty expiring: ${asset.assetTagId}`,
        body: `${asset.description} — warranty ends ${asset.warrantyExpiryDate.toLocaleDateString("en-IN")}.`,
      });
    }
  }

  if (asset.lastMovedAt) {
    const idleDays = (now.getTime() - asset.lastMovedAt.getTime()) / 86400000;
    if (idleDays >= IDLE_DAYS) {
      alerts.push({
        title: `Asset idle: ${asset.assetTagId}`,
        body: `${asset.description} has not moved in ${Math.floor(idleDays)} days.`,
      });
    }
  }

  if (!asset.locationId) {
    alerts.push({
      title: `Missing location: ${asset.assetTagId}`,
      body: `${asset.description} has no location assigned.`,
    });
  }

  if (asset.cost > 0 && asset.cost < LOW_COST_THRESHOLD) {
    alerts.push({
      title: `Low-value asset flagged: ${asset.assetTagId}`,
      body: `${asset.description} is below ₹${LOW_COST_THRESHOLD} — verify classification.`,
    });
  }

  const managers = asset.jobSite.assignments.map((a) => a.user);
  const admin = await prisma.user.findFirst({
    where: { companyId: asset.companyId, role: "ADMIN", active: true },
  });

  for (const alert of alerts) {
    for (const mgr of managers) {
      await notifyUser(mgr.id, NOTIFICATION_TYPE.ALERT, alert.title, alert.body, {
        assetId: asset.id,
      });
    }
    if (admin) {
      await notifyUser(admin.id, NOTIFICATION_TYPE.ALERT, alert.title, alert.body, {
        assetId: asset.id,
        escalated: true,
      });
    }
  }
}

export async function getAlertsForUser(userId: string, companyId: string | null, role: string) {
  const notifications = await prisma.inAppNotification.findMany({
    where: {
      userId,
      type: NOTIFICATION_TYPE.ALERT,
      read: false,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (role === "ADMIN" && companyId) {
    const assets = await prisma.fixedAsset.findMany({
      where: { companyId, retiredAt: null },
      select: {
        id: true,
        assetTagId: true,
        description: true,
        maintenanceDueDate: true,
        warrantyExpiryDate: true,
        locationId: true,
      },
    });
    return { notifications, assetFlags: assets };
  }

  return { notifications, assetFlags: [] };
}
