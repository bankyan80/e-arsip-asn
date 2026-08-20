import { getSession } from "./auth";
import type { Role } from "./types";

const ROLES: Role[] = ["SUPER ADMIN", "ADMIN", "OPERATOR"];

export function roleRank(role: Role): number {
  const idx = ROLES.indexOf(role);
  return idx === -1 ? -1 : idx;
}

export function can(userRole: Role, requiredRole: Role): boolean {
  return roleRank(userRole) <= roleRank(requiredRole);
}

export async function currentUser() {
  return getSession();
}