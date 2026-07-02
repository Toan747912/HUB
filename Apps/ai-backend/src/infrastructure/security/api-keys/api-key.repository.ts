import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { ApiKeyDocument } from './api-key.schema';

@Injectable()
export class ApiKeyRepository {
  constructor(@InjectModel('ApiKey') private readonly model: Model<ApiKeyDocument>) {}

  async findActiveByHash(keyHash: string): Promise<ApiKeyDocument | null> {
    return this.model.findOne({ keyHash, revokedAt: null }).lean<ApiKeyDocument>().exec();
  }

  async create(keyHash: string, label: string): Promise<ApiKeyDocument> {
    const doc = await this.model.create({ _id: randomUUID(), keyHash, label, revokedAt: null });
    return doc.toObject();
  }

  async revoke(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { revokedAt: new Date() } });
  }
}
