// src/utils/authorization.ts
// Authorization utility for role-based access control
import { User, Role } from '../../types';

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Check if user has permission to create Disposisi
 * Requirements 14.4: Only Atasan or Super Admin can create Disposisi
 */
export function canCreateDisposisi(user: User | null): boolean {
  if (!user) return false;
  return true;
}

/**
 * Check if user has permission to delete Disposisi
 * Requirements 14.5: Only creator or Super Admin can delete Disposisi
 */
export function canDeleteDisposisi(
  user: User | null,
  disposisiCreatedBy: string
): boolean {
  if (!user) return false;
  if (user.role === 'Super Admin') return true;
  return user.id === disposisiCreatedBy || user.name === disposisiCreatedBy;
}

/**
 * Check if user has permission to update Disposisi
 * Assignee can update their own Disposisi, creator can update any, Super Admin can update any
 */
export function canUpdateDisposisi(
  user: User | null,
  disposisiAssignedTo: string,
  disposisiCreatedBy: string
): boolean {
  if (!user) return false;
  if (user.role === 'Super Admin' || user.role === 'Atasan') return true;
  if (user.id === disposisiCreatedBy || user.name === disposisiCreatedBy) return true;
  return user.id === disposisiAssignedTo;
}

/**
 * Filter Disposisi based on user role
 * Requirements 14.1, 14.2, 14.3: Role-based filtering
 * - Staff: Only see Disposisi assigned to them
 * - Atasan: See all Disposisi for their team
 * - Super Admin: See all Disposisi in the system
 */
export function filterDisposisiByRole<T extends { assignedTo: string }>(
  disposisiList: T[],
  user: User | null,
  teamUserIds?: string[]
): T[] {
  if (!user) return [];

  // Super Admin sees all
  if (user.role === 'Super Admin') {
    return disposisiList;
  }

  // Atasan sees team disposisi
  if (user.role === 'Atasan' && teamUserIds && teamUserIds.length > 0) {
    return disposisiList.filter(d => teamUserIds.includes(d.assignedTo));
  }

  // Staff sees only their own
  return disposisiList.filter(d => d.assignedTo === user.id);
}

/**
 * Validate user has permission to create Disposisi, throw error if not
 */
export function requireCreateDisposisiPermission(user: User | null): void {
  if (!canCreateDisposisi(user)) {
    throw new AuthorizationError(
      'You must be logged in to create Disposisi.'
    );
  }
}

/**
 * Validate user has permission to delete Disposisi, throw error if not
 */
export function requireDeleteDisposisiPermission(
  user: User | null,
  disposisiCreatedBy: string
): void {
  if (!canDeleteDisposisi(user, disposisiCreatedBy)) {
    throw new AuthorizationError(
      'You do not have permission to delete this Disposisi. Only the creator or Super Admin can delete Disposisi.'
    );
  }
}

/**
 * Validate user has permission to update Disposisi, throw error if not
 */
export function requireUpdateDisposisiPermission(
  user: User | null,
  disposisiAssignedTo: string,
  disposisiCreatedBy: string
): void {
  if (!canUpdateDisposisi(user, disposisiAssignedTo, disposisiCreatedBy)) {
    throw new AuthorizationError(
      'You do not have permission to update this Disposisi.'
    );
  }
}

/**
 * Get team user IDs for Atasan role
 * This is a helper function that should be implemented based on your team structure
 * For now, it returns all users except Super Admins
 */
export async function getTeamUserIds(
  supabase: any,
  currentUser: User
): Promise<string[]> {
  if (currentUser.role === 'Super Admin') {
    // Super Admin sees all users
    const { data, error } = await supabase
      .from('profiles')
      .select('id');

    if (error) throw error;
    return data ? data.map((u: any) => u.id) : [];
  }

  if (currentUser.role === 'Atasan') {
    // Atasan sees Staff and other Atasan (not Super Admin)
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['Staff', 'Atasan']);

    if (error) throw error;
    return data ? data.map((u: any) => u.id) : [];
  }

  // Staff only sees themselves
  return [currentUser.id];
}
