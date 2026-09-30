// // files.controller.ts
// //
// // Chunks arrive/leave as raw `application/octet-stream` bodies, never JSON,
// // so they're piped straight to/from disk and never fully buffered in memory
// // even for large files. Express's built-in body parsers only touch
// // application/json and application/x-www-form-urlencoded, so the raw
// // request stream below reaches us untouched — no extra Nest config needed.
// //
// // Add your existing auth guard (e.g. @UseGuards(JwtAuthGuard)) at the class
// // or method level; omitted here for brevity.

// import {
//   Controller,
//   Post,
//   Put,
//   Get,
//   Param,
//   ParseIntPipe,
//   Body,
//   Req,
//   Res,
//   BadRequestException,
// } from '@nestjs/common';
// import type { Request, Response } from 'express';
// import * as fs from 'fs';
// import { pipeline } from 'stream/promises';
// import { FilesService } from './files.service';
// import type { InitUploadDto, CompleteUploadDto } from './upload-session.types';

// @Controller('files')
// export class FilesController {
//   constructor(private readonly filesService: FilesService) {}

//   @Post('init')
//   async initUpload(@Body() dto: InitUploadDto) {
//     return this.filesService.initUpload(dto);
//   }

//   /**
//    * Streams one encrypted chunk to disk. The chunk's wire format
//    * ([iv][ciphertext][authTag]) is opaque to the server — it just stores
//    * bytes, it never decrypts.
//    */
//   @Put(':uploadId/chunks/:index')
//   async receiveFile(
//     @Param('uploadId') uploadId: string,
//     @Param('index', ParseIntPipe) index: number,
//     @Req() req: Request,
//   ): Promise<{ received: number }> {
//     const destPath = this.filesService.chunkPath(uploadId, index);
//     const tmpPath = `${destPath}.part`;

//     try {
//       await pipeline(req, fs.createWriteStream(tmpPath));
//     } catch (err) {
//       await fs.promises.unlink(tmpPath).catch(() => {});
//       throw new BadRequestException(`Failed to write chunk ${index}: ${err}`);
//     }

//     // Atomic rename so a half-written file is never mistaken for a complete chunk.
//     await fs.promises.rename(tmpPath, destPath);
//     this.filesService.markChunkReceived(uploadId, index);

//     return { received: index };
//   }

//   @Post(':uploadId/complete')
//   async completeUpload(
//     @Param('uploadId') uploadId: string,
//     @Body() dto: CompleteUploadDto,
//   ) {
//     this.filesService.completeUpload(uploadId, dto);
//     return { status: 'complete' };
//   }

//   @Get(':uploadId/manifest')
//   async getManifest(@Param('uploadId') uploadId: string) {
//     return this.filesService.getManifest(uploadId);
//   }

//   @Get(':uploadId/status')
//   async getStatus(@Param('uploadId') uploadId: string) {
//     return { missingChunks: this.filesService.getMissingChunks(uploadId) };
//   }

//   /** Streams one encrypted chunk back out, unchanged, for the client to decrypt. */
//   @Get(':uploadId/chunks/:index')
//   async sendChunk(
//     @Param('uploadId') uploadId: string,
//     @Param('index', ParseIntPipe) index: number,
//     @Res() res: Response,
//   ): Promise<void> {
//     const chunkPath = this.filesService.chunkPath(uploadId, index);
//     res.setHeader('Content-Type', 'application/octet-stream');
//     await pipeline(fs.createReadStream(chunkPath), res);
//   }
// }
