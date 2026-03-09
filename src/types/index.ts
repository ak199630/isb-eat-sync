export type StallStatus = "open" | "busy" | "closed";

export type MenuCategory = "main" | "beverage" | "snack" | "breakfast" | "other";

export type UserRole = "student" | "authorized" | "vendor";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  isAvailable: boolean;
}

export interface Stall {
  id: string;
  name: string;
  status: StallStatus;
  estimatedPrepTimeMinutes: number;
  requiresAuthorizedRole: boolean;
  menuItems: MenuItem[];
}

export interface User {
  id: string;
  displayName: string;
  role: UserRole;
  residentialBlockId?: string | null;
  /** Set when role is vendor: the stall this user manages. */
  stallId?: string | null;
}

export interface ResidentialBlock {
  id: string;
  code: string;
  displayName: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type PickupOption = "as_soon_as_ready" | { slot: { start: Date; end: Date } };

export interface Order {
  id: string;
  stallId: string;
  stallName: string;
  status: string;
  targetPickupStart: Date;
  targetPickupEnd: Date;
  prepTimeMinutes: number;
  totalCents: number;
  qrToken: string;
  residentialBlockId: string | null;
  leaveNowNotificationSentAt: Date | null;
  orderNotes?: string | null;
  createdAt: Date;
}

/** Vendor inbox list item: order with block code and item summary. */
export interface VendorOrderListItem {
  id: string;
  shortId: string;
  status: string;
  targetPickupStart: Date;
  targetPickupEnd: Date;
  totalCents: number;
  itemSummary: string;
  itemCount: number;
  residentialBlockCode: string | null;
  orderNotes: string | null;
  /** Set in Feature 7; until then always false. */
  customerLeftAt: Date | null;
  /** Queue-based ETA (accepted/preparing orders only). */
  estimatedReadyAt: Date | null;
  /** Free-text: assigned cook or station (Feature 8). */
  assignedTo: string | null;
  createdAt: Date;
}
