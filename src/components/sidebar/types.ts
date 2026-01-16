import { LucideIcon } from "lucide-react";

export type UserRole = 'admin' | 'manager' | 'investigator' | 'vendor';

export interface MenuItem {
  title: string;
  icon: LucideIcon;
  url: string;
  roles: UserRole[];
  badgeKey?: 'pendingCaseRequests'; // Key to lookup badge count from context
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export interface UserProfile {
  full_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
}

export interface OrgSettings {
  logo_url: string | null;
  square_logo_url: string | null;
  company_name: string | null;
}
