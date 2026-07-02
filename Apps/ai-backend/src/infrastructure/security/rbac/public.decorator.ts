import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_METADATA_KEY = 'isPublic';

/** Marks a route (or an entire controller) as exempt from the global JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_METADATA_KEY, true);
