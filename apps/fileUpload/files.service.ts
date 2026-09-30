import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from "cloudinary"
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
	UploadSession,
	InitUploadDto,
	CompleteUploadDto,
} from './upload-session.types';

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_ROOT ?? './uploads/chat');

@Injectable()
export class FilesService {
	constructor(private readonly configService: ConfigService) {
		cloudinary.config({
			cloud_name: this.configService.get<string>("CLOUDINARY_CLOUD_NAME"),
			api_key: this.configService.get<string>("CLOUDINARY_API_KEY"),
			api_secret: this.configService.get<string>("CLOUDINARY_API_SECRET")
		})
	}

	private sessions = new Map<string, UploadSession>();

	async initUpload(dto: InitUploadDto): Promise<{ uploadId: string }> {
		const uploadId = randomUUID();
		const dir = path.join(UPLOAD_ROOT, uploadId);
		await fs.promises.mkdir(dir, { recursive: true });

		this.sessions.set(uploadId, {
			uploadId,
			fileName: dto.fileName,
			fileSize: dto.fileSize,
			totalChunks: dto.totalChunks,
			wrappedKey: dto.wrappedKey,
			dir,
			receivedChunks: new Set(),
			complete: false,
		});

		return { uploadId };
	}

	getSession(uploadId: string): UploadSession {
		const session = this.sessions.get(uploadId);
		if (!session) throw new NotFoundException(`Unknown uploadId ${uploadId}`);
		return session;
	}

	chunkPath(uploadId: string, index: number): string {
		const session = this.getSession(uploadId);
		if (index < 0 || index >= session.totalChunks) {
			throw new BadRequestException(`Chunk index ${index} out of range`);
		}
		return path.join(session.dir, `${index}.bin`);
	}

	markChunkReceived(uploadId: string, index: number): void {
		this.getSession(uploadId).receivedChunks.add(index);
	}

	getMissingChunks(uploadId: string): number[] {
		const session = this.getSession(uploadId);
		const missing: number[] = [];
		for (let i = 0; i < session.totalChunks; i++) {
			if (!session.receivedChunks.has(i)) missing.push(i);
		}
		return missing;
	}

	completeUpload(uploadId: string, dto: CompleteUploadDto): void {
		const session = this.getSession(uploadId);
		const missing = this.getMissingChunks(uploadId);
		if (missing.length > 0) {
			throw new BadRequestException(`Missing chunks: ${missing.join(', ')}`);
		}
		session.fileHash = dto.fileHash;
		session.complete = true;
	}

	getManifest(uploadId: string) {
		const session = this.getSession(uploadId);
		if (!session.complete) {
			throw new BadRequestException('Upload not yet complete');
		}
		return {
			fileName: session.fileName,
			fileSize: session.fileSize,
			totalChunks: session.totalChunks,
			wrappedKey: session.wrappedKey,
			fileHash: session.fileHash,
		};
	}

	generateSignature({ userId, id }) {
		const timestamp = Math.round(new Date().getTime() / 1000)
		const params = {
			timestamp,
			folder: 'profile_photo',
			public_id: id,
		};
		const signature = cloudinary.utils.api_sign_request(
			params, this.configService.get<string>("CLOUDINARY_API_SECRET")!
		)
		return {
			signature,
			timestamp,
			apiKey: this.configService.get<string>("CLOUDINARY_API_KEY"),
			cloudName: this.configService.get<string>("CLOUDINARY_CLOUD_NAME")
		}
	}
}
