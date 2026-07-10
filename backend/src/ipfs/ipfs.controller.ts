import { Controller, Post, Body, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IpfsService } from './ipfs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ipfs')
@UseGuards(JwtAuthGuard)
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.ipfsService.pinFileToIpfs(file.buffer, file.originalname);
  }

  @Post('upload-json')
  async uploadJson(
    @Body() jsonBody: any,
  ) {
    return this.ipfsService.pinJsonToIpfs(jsonBody);
  }
}
