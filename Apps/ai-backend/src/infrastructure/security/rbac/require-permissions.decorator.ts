import { SetMetadata } from '@nestjs/common';
import { Permission } from './permission.enum';

export const PERMISSIONS_METADATA_KEY = 'requiredPermissions';

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
