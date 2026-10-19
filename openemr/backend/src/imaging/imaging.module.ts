import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImagingController } from './imaging.controller';
import { ImagingService } from './imaging.service';
import { OrthancService } from './orthanc.service';
import { Imaging } from './imaging.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Imaging])],
    controllers: [ImagingController],
    providers: [ImagingService, OrthancService],
    exports: [ImagingService, OrthancService],
})
export class ImagingModule {}
