import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { Role } from '../rbac/role.enum';
import { UserDocument } from './user.schema';

@Injectable()
export class UserRepository {
  constructor(@InjectModel('User') private readonly model: Model<UserDocument>) {}

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.model.findOne({ username }).lean<UserDocument>().exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).lean<UserDocument>().exec();
  }

  async create(username: string, passwordHash: string, roles: Role[]): Promise<UserDocument> {
    const doc = await this.model.create({ _id: randomUUID(), username, passwordHash, roles });
    return doc.toObject();
  }

  async updateRoles(id: string, roles: Role[]): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { roles } });
  }
}
