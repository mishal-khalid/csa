import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EvaluationService } from './evaluation.service.js';
import { fromEvaluationSite, MjsccRateLimit } from './guards.js';
import { MjsccController } from './mjscc.controller.js';
import { MjsccPrisma } from './prisma.service.js';
import { InstructorSignedIn, MjsccSessions } from './sessions.js';

// The MJSCC instructor evaluation (mjscc.agee.pro). It shares the API's server with the CSA Portal
// but none of its accounts, sessions or tables: everything here goes through its own database client.
@Module({
  controllers: [MjsccController],
  providers: [MjsccPrisma, MjsccSessions, MjsccRateLimit, InstructorSignedIn, EvaluationService],
})
export class MjsccModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(fromEvaluationSite).forRoutes(MjsccController);
  }
}
