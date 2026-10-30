import { Controller, Get, Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { SignedIn } from './auth/guards.js';
import { SessionsService } from './auth/sessions.service.js';
import { PrismaService } from './prisma.service.js';
import { HumanService } from './security/human.service.js';
import { RateLimitService } from './security/rate-limit.service.js';
import { DirectoryController } from './directory/directory.controller.js';
import { DirectoryService } from './directory/directory.service.js';
import { FingerprintLoginController } from './fingerprints/fingerprint-login.controller.js';
import { FingerprintsController } from './fingerprints/fingerprints.controller.js';
import { FingerprintsService } from './fingerprints/fingerprints.service.js';
import { ChallengesService } from './fingerprints/webauthn.js';
import { UsersController } from './users/users.controller.js';
import { UsersService } from './users/users.service.js';

// for uptime checks
@Controller('health')
class HealthController {
  @Get()
  health() {
    return { ok: true };
  }
}

@Module({
  controllers: [HealthController, AuthController, UsersController, FingerprintsController, FingerprintLoginController, DirectoryController],
  providers: [
    PrismaService,
    RateLimitService,
    HumanService,
    SessionsService,
    AuthService,
    UsersService,
    ChallengesService,
    FingerprintsService,
    DirectoryService,
    SignedIn,
  ],
})
export class AppModule {}
