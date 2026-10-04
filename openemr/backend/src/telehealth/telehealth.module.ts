import { Module } from '@nestjs/common';
import { TelehealthGateway } from './telehealth.gateway';

/**
 * Video-consultation signalling (WebRTC). Stateless relay — see TelehealthGateway.
 */
@Module({
    providers: [TelehealthGateway],
})
export class TelehealthModule {}
