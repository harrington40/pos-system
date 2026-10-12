import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { RolesGuard } from './roles.guard';
import { AbacModule } from './abac/abac.module';
import { getJwtSecret } from './jwt-secret';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        // Resolved by a factory so the secret is read after ConfigModule has
        // loaded .env, and from the same place JwtStrategy reads it. See
        // getJwtSecret() for why the ordering matters.
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: getJwtSecret(),
                signOptions: { expiresIn: '8h' },
            }),
        }),
        AbacModule,
    ],
    controllers: [AuthController],
    providers: [JwtStrategy, RolesGuard],
    exports: [PassportModule, JwtModule, RolesGuard, AbacModule],
})
export class AuthModule {}
