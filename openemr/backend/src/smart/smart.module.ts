import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SmartController } from './smart.controller';
import { getJwtSecret } from '../auth/jwt-secret';

@Module({
    imports: [
        // See getJwtSecret(): resolved after .env is loaded, from one shared
        // source, so the signer and verifier cannot drift apart.
        JwtModule.registerAsync({
            useFactory: () => ({ secret: getJwtSecret() }),
        }),
    ],
    controllers: [SmartController],
})
export class SmartModule {}
