import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@parkap/shared';

export const ROLES_KEY = 'roles';

/** RBAC wired from day one even though only citizen routes exist yet - adding
 * the operator dashboard later must not require re-plumbing auth. */
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
