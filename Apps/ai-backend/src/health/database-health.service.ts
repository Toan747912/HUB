import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export type DbHealthStatus = 'connected' | 'disconnected' | 'connecting' | 'disconnecting';

@Injectable()
export class DatabaseHealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  isReady(): boolean {
    return this.connection.readyState === 1;
  }

  getStatus(): DbHealthStatus {
    const states: Record<number, DbHealthStatus> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[this.connection.readyState] ?? 'disconnected';
  }
}
