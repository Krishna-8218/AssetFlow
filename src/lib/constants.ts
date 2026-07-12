// ============================================================
// CONSTANTS & ENUMS
// ============================================================

// User Roles
export const ROLES = {
  ADMIN: 'ADMIN',
  ASSET_MANAGER: 'ASSET_MANAGER',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE: 'Employee',
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'danger',
  ASSET_MANAGER: 'info',
  DEPARTMENT_HEAD: 'warning',
  EMPLOYEE: 'neutral',
};

// Asset Statuses
export const ASSET_STATUS = {
  AVAILABLE: 'AVAILABLE',
  ALLOCATED: 'ALLOCATED',
  RESERVED: 'RESERVED',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  LOST: 'LOST',
  RETIRED: 'RETIRED',
  DISPOSED: 'DISPOSED',
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

export const ASSET_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  ALLOCATED: 'Allocated',
  RESERVED: 'Reserved',
  UNDER_MAINTENANCE: 'Under Maintenance',
  LOST: 'Lost',
  RETIRED: 'Retired',
  DISPOSED: 'Disposed',
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'success',
  ALLOCATED: 'info',
  RESERVED: 'warning',
  UNDER_MAINTENANCE: 'warning',
  LOST: 'danger',
  RETIRED: 'neutral',
  DISPOSED: 'neutral',
};

// Valid Asset Status Transitions
export const VALID_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED'],
  ALLOCATED: ['AVAILABLE', 'UNDER_MAINTENANCE', 'LOST'],
  RESERVED: ['AVAILABLE', 'ALLOCATED'],
  UNDER_MAINTENANCE: ['AVAILABLE', 'RETIRED'],
  LOST: ['AVAILABLE', 'DISPOSED'],
  RETIRED: ['DISPOSED'],
  DISPOSED: [],
};

// Asset Conditions
export const ASSET_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const;

export const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  DAMAGED: 'Damaged',
};

// Allocation Status
export const ALLOCATION_STATUS = {
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
} as const;

// Transfer Status
export const TRANSFER_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  TRANSFERRED: 'TRANSFERRED',
  RETURNED: 'RETURNED',
} as const;

export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  TRANSFERRED: 'Transferred',
  RETURNED: 'Returned',
};

export const TRANSFER_STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  TRANSFERRED: 'info',
  RETURNED: 'neutral',
};

// Booking Status
export const BOOKING_STATUS = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  UPCOMING: 'info',
  ONGOING: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};

// Maintenance Status
export const MAINTENANCE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  TECHNICIAN_ASSIGNED: 'TECHNICIAN_ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const MAINTENANCE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  TECHNICIAN_ASSIGNED: 'info',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
};

export const MAINTENANCE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

// Audit Status
export const AUDIT_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
} as const;

export const AUDIT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

export const AUDIT_VERIFICATION = {
  VERIFIED: 'VERIFIED',
  MISSING: 'MISSING',
  DAMAGED: 'DAMAGED',
} as const;

export const VERIFICATION_LABELS: Record<string, string> = {
  VERIFIED: 'Verified',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
};

export const VERIFICATION_COLORS: Record<string, string> = {
  VERIFIED: 'success',
  MISSING: 'danger',
  DAMAGED: 'warning',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  ASSET_ASSIGNED: 'ASSET_ASSIGNED',
  TRANSFER_APPROVED: 'TRANSFER_APPROVED',
  TRANSFER_REJECTED: 'TRANSFER_REJECTED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_REMINDER: 'BOOKING_REMINDER',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  MAINTENANCE_APPROVED: 'MAINTENANCE_APPROVED',
  MAINTENANCE_REJECTED: 'MAINTENANCE_REJECTED',
  MAINTENANCE_COMPLETED: 'MAINTENANCE_COMPLETED',
  AUDIT_ASSIGNED: 'AUDIT_ASSIGNED',
  AUDIT_COMPLETED: 'AUDIT_COMPLETED',
  OVERDUE_RETURN: 'OVERDUE_RETURN',
  DISCREPANCY_DETECTED: 'DISCREPANCY_DETECTED',
} as const;

// Activity Log Entity Types
export const ENTITY_TYPES = {
  USER: 'USER',
  DEPARTMENT: 'DEPARTMENT',
  CATEGORY: 'CATEGORY',
  ASSET: 'ASSET',
  ALLOCATION: 'ALLOCATION',
  TRANSFER: 'TRANSFER',
  BOOKING: 'BOOKING',
  MAINTENANCE: 'MAINTENANCE',
  AUDIT: 'AUDIT',
} as const;

// Sidebar Navigation
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Organization Setup', href: '/organization', icon: 'Building2', roles: ['ADMIN'] },
  { label: 'Assets', href: '/assets', icon: 'Package', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Allocation & Transfer', href: '/allocation', icon: 'ArrowLeftRight', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Resource Booking', href: '/booking', icon: 'CalendarDays', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Maintenance', href: '/maintenance', icon: 'Wrench', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Audit', href: '/audit', icon: 'ClipboardCheck', roles: ['ADMIN', 'ASSET_MANAGER'] },
  { label: 'Reports', href: '/reports', icon: 'BarChart3', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'] },
  { label: 'Activity Logs', href: '/activity', icon: 'History', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Notifications', href: '/notifications', icon: 'Bell', roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
];

// Default pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Asset Tag prefix
export const ASSET_TAG_PREFIX = 'AF';

// Date formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';
