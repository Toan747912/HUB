import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeySchema } from './api-key.schema';
import { ApiKeyRepository } from './api-key.repository';
import { ApiKeyService } from './api-key.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'ApiKey', schema: ApiKeySchema }])],
  providers: [ApiKeyRepository, ApiKeyService],
  exports: [ApiKeyRepository, ApiKeyService]
})
export class ApiKeysModule {}
