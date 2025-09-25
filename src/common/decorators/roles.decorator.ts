import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('ADMIN' | 'VIEWER')[]) => SetMetadata(ROLES_KEY, roles);
