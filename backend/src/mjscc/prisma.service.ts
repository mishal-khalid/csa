import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/mjscc/client.js';
import { mjsccConfig } from './config.js';

// The evaluation's own database client, connected as its own database user. It only knows the
// "mjscc" schema's tables (prisma/mjscc/schema.prisma).
@Injectable()
export class MjsccPrisma extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: mjsccConfig!.databaseUrl }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
