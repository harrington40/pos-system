import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AvatarsService } from './avatars.service';

@Controller('avatars')
@UseGuards(JwtAuthGuard)
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const userId = req.user?.sub || req.user?.id || 0;
    const avatar = await this.avatarsService.uploadAvatar(userId, file);
    return { id: avatar.id, originalName: avatar.originalName, b2Path: avatar.b2Path };
  }

  /**
   * The caller's own avatar.
   *
   * Avatars belong to users, and the SPA is not told its own user id at login —
   * so the profile page asks for "me" rather than guessing. MUST stay above the
   * `:userId` route or "me" would be parsed as an id.
   */
  @Get('me')
  async getMine(@Req() req: any) {
    const userId = Number(req.user?.sub || req.user?.id || 0);
    const result = await this.avatarsService.getAvatar(userId);
    return { ...result, userId };
  }

  @Get(':userId')
  async get(@Param('userId') userId: string) {
    return this.avatarsService.getAvatar(parseInt(userId, 10));
  }

  @Delete(':userId')
  async delete(@Param('userId') userId: string) {
    await this.avatarsService.deleteAvatar(parseInt(userId, 10));
    return { message: 'Avatar deleted' };
  }
}
