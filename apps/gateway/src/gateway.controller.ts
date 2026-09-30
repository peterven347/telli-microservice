import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, Res, Inject, Query, Patch, StreamableFile, UploadedFile, UseInterceptors, UploadedFiles, SetMetadata, Request, Delete, } from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { File as MulterFile } from 'multer';
import { createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { lookup } from 'mime-types';
import { pipeline } from 'stream/promises';
import * as fs from 'fs';
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto, PostDto } from '@app/dtos/dto';
import { KafkaProducer } from 'apps/kafka/kafka.producer';
import { Public } from './auth/jwt-auth.guard';
import { lastValueFrom } from 'rxjs';
import { AuthService } from "./gateway.service"
import { FilesService } from 'apps/fileUpload/files.service';
import type { Request as Requesttttt, Response } from 'express';

export interface UploadSession {
	uploadId: string;
	fileName: string;
	fileSize: number;
	totalChunks: number;
	wrappedKey: string; // base64 RSA-OAEP encrypted AES key, opaque to the server
	dir: string; // on-disk directory holding this file's chunks
	receivedChunks: Set<number>;
	fileHash?: string; // set once the client confirms upload completion
	complete: boolean;
}

export interface InitUploadDto {
	fileName: string;
	fileSize: number;
	totalChunks: number;
	wrappedKey: string;
}

export interface CompleteUploadDto {
	fileHash: string;
}



const sectorImg = diskStorage({
	destination: '../../../uploads/sectorImg',
	filename: (req, file, cb) => {
		const ext = `${extname(file.originalname)}`;
		// cb(null, req.user.id)
		cb(null, Date.now().toString() + '-' + Math.round(Math.random() * 1e9) + ext)
	},
});


const uploadPath = join(process.cwd(), 'uploads', 'chat');
if (!existsSync(uploadPath)) {
	mkdirSync(uploadPath, { recursive: true });
}
const chat = diskStorage({
	destination: uploadPath,
	filename: (req, file, cb) => {
		const fileExtension = `${extname(file.originalname)}`;
		cb(null, file.originalname)
		// cb(null, Date.now().toString() + '-' + file.originalname)
	},
});

const post = diskStorage({
	destination: '../../../uploads/post',
	filename: (req, file, cb) => {
		const fileExtension = `${extname(file.originalname)}`;
		cb(null, Date.now().toString() + '-' + file.originalname)
	},
});

const fileFilter = (req, file, cb) => {
	if (file.mimetype === "image/jpg" || file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
		cb(null, true)
	} else {
		cb(null, false)
	}
};

const chatFileFilter = (req, file, cb) => {
	if (
		file.mimetype === "image/jpg" ||
		file.mimetype === "image/jpeg" ||
		file.mimetype === "image/png" ||
		file.mimetype === "image/gif" ||
		file.mimetype === "image/webp" ||

		file.mimetype === "audio/mpeg" ||
		file.mimetype === "audio/mp3" ||
		file.mimetype === "audio/wav" ||
		file.mimetype === "audio/ogg" ||

		file.mimetype === "video/mp4" ||
		file.mimetype === "video/mpeg" ||
		file.mimetype === "video/quicktime" ||

		file.mimetype === "application/pdf" ||

		file.mimetype === "application/msword" ||
		file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||

		file.mimetype === "application/vnd.ms-excel" ||
		file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||

		file.mimetype === "application/vnd.ms-powerpoint" ||
		file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||

		file.mimetype === "text/plain"
	) {
		cb(null, true)
	}
	else {
		cb(false)
	}
}

const getImage = async (imgName: string, folder: string): Promise<StreamableFile> => {
	try {
		if (!imgName) throw new Error("empty image")
		const filePath = join(process.cwd(), `uploads/${folder}`, imgName);
		if (!existsSync(filePath)) {
			mkdirSync(filePath, { recursive: true });
		}
		await fs.promises.access(filePath);
		const file = createReadStream(filePath);
		const { size } = statSync(filePath);
		return new StreamableFile(file, {
			type: lookup(filePath) || 'application/octet-stream',
			disposition: 'inline',
			length: size

		});
	} catch (err: any) {
		if (folder === "chat") throw err
		const filePath = join(process.cwd(), `../uploads/${folder}`, "sectorImg.jpg");
		await fs.promises.access(filePath);
		const file = createReadStream(filePath);
		return new StreamableFile(file, {
			type: lookup(filePath) || 'application/octet-stream',
			disposition: 'inline'
		});
	}
}

// @Controller("auth")
// export class AuthController {
// 	constructor(
// 		private readonly authService: AuthService
// 	) { }
// 	@Post("refresh-access-token")
// 	async refreshAccessToken(@Body() body: any) {
// 		return this.authService.refreshAccessToken(body)
// 	}
// }

@Controller('chat')
export class ChatController {
	constructor(
		@Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
		private readonly kafkaProducer: KafkaProducer
	) { }

	@Public()
	@Get("test")
	async test(@Request() req) {
		return { message: true }
	}

	@Public()
	@Get('sector_img/:file')
	async getDomainImage(@Param('file') imgName: string) {
		return await getImage(imgName, "sectorImg")
	}

	@Public()
	@Get('chat/:file')
	async getChatImage(@Param('file') fileName: string) {
		return await getImage(fileName, "chat")
	}

	@Get("domain")
	async getDomain() {
		return this.chatClient.send({ cmd: "get_domain" }, {})
	};

	@Get("domain/:domain_id")
	async getSectorDomain(@Param("domain_id") domainId: string, @Request() req: any) {
		const userId = req.user.id
		return this.chatClient.send({ cmd: "get_sector_domain" }, { domainId, userId })
	};

	@Get("message/:sector_id/:skip")
	async getMissedMessages(@Param("sector_id") sectorId: string, @Param("skip") skip: number) {
		return this.chatClient.send({ cmd: "get_missed_messages" }, { sectorId, skip })
	};

	@Get("sectors")
	async searchSectorsByTitle(@Query("q") sectorTitle?: string) {
		return this.chatClient.send({ cmd: "find_sector_to_join" }, sectorTitle)
	};


	@Patch("sector/:sector_id")
	async exitSector(@Param("sector_id") sectorId: string, @Request() req: any) {
		const userId = req.user.id
		return this.chatClient.send({ cmd: "exit_sector" }, { sectorId, userId })
	}

	@Patch("domain/:domain_id")
	async exitDomain(@Param("domain_id") domainId: string, @Request() req: any) {
		const userId = req.user.id
		return this.chatClient.send({ cmd: "exit_domain" }, { domainId, userId })
	}


	@Patch("domain/:domain_id/logo")
	@UseInterceptors(FileInterceptor('file', {
		fileFilter,
		storage: sectorImg,
		// limits: { fileSize: 10 * 1024 * 1024 }, //10MB
	}))
	async editDomainImg(@Param("domain_id") domainId: string, @Request() req: any) {
		const userId = req.user.id
		return this.chatClient.send({ cmd: "edit_domain_img" }, { domainId, userId })
	}

	@Post("domain")
	@UseInterceptors(FileInterceptor('file', {
		fileFilter,
		storage: sectorImg,
		// limits: { fileSize: 10 * 1024 * 1024 }, //10MB
	}))
	async createNewDomain(@UploadedFile() file: MulterFile, @Body() body: any, @Request() req: any) {
		console.log(req.user, "gateway controller")
		const payload = {
			...body,
			userId: req.user.id,
			userName: req.user.userName
		};
		return this.chatClient.send({ cmd: "create_domain" }, payload)
	};

	@Post("sector/:domain_id")
	@UseInterceptors(FileInterceptor('file', {
		fileFilter,
		storage: sectorImg,
		// limits: { fileSize: 10 * 1024 * 1024 }, //10MB
	}))
	async createNewSector(@UploadedFile() file: MulterFile, @Param("domain_id") domainId: string, @Body() body: any, @Request() req: any) {
		const payload = {
			domainId: domainId,
			...body,
			userId: req.user.id,
			userName: req.user.userName
		};
		return this.chatClient.send({ cmd: "create_sector" }, payload)
	};

	@Post("message/:sector_id")
	@UseInterceptors(FileInterceptor('file', {
		fileFilter: chatFileFilter,
		storage: chat,
	}))
	async uploadFileinChat(@UploadedFile() file: MulterFile) {
		if (!file) {
			return { success: false, message: 'No file received or file was rejected by filter' };
		}
		return { success: true, filename: file.filename };
	};

	@Patch("/domain/:domain_id")
	async changeDomainHolder(@Param("domain_id") domainId: string, @Query("q") q: string, @Body() body: any) {
		return this.chatClient.send({ cmd: "edit_domain" }, { domainId, q, body })
	};

	@Patch("/sector/:sector_id/:domain_id")
	async changeSectorName(@Param("sector_id") sectorId: string, @Param("domain_id") domainId: string, @Body() body: any) {
		return this.chatClient.send({ cmd: "change_sector_name" }, { sectorId, domainId, body })
	};
}

@Controller('livestream')
export class LivestreamController {
	constructor(
		@Inject('LIVESTREAM_SERVICE') private readonly liveStreamClient: ClientProxy,
	) { }

	// @Public()
	@Get("/start_stream")
	async startStream(@Request() req: any) {
		try {
			const userId = req.user.id
			return this.liveStreamClient.send({ cmd: "create_live_stream" }, userId)
		}
		catch (err) {
			console.log(err)
		}
	}

	@Get("/stop_stream")
	async stopStream(@Request() req: any) {
		try {
			const userId = req.user.id
			return this.liveStreamClient.send({ cmd: "stop_live_stream" }, userId)
		}
		catch (err) {
			console.log(err)
		}
	}

	@Get("/streams")
	async getStreams(@Request() req: any) {
		try {
			const userId = req.user.id
			return this.liveStreamClient.send({ cmd: "find_all_livestream" }, userId)
		}
		catch (err) {
			console.log(err)
		}
	}

	// @Get("/stream")
	// async getStream(@Request() req: any) {
	// 	return this.liveStreamClient.send({ cmd: "findOneLivestream" }, id)
	// }

	@Get("/comments")
	async getStreamComments(@Request() req: any) {
		return this.liveStreamClient.send({ cmd: "get_stream_comments" }, {})
	}

}

@Controller('post')
export class PostController {
	constructor(@Inject('POST_SERVICE') private readonly postClient: ClientProxy) { }

	@Get('sector_img/:file')
	async getDomainImage(@Param('file') imgName: string) {
		return await getImage(imgName, "sectorImg")
	}

	@Get('post_img/:file')
	async getPostImage(@Param('file') imgName: string) {
		return await getImage(imgName, "post")
	}

	@Get("posts")
	async getPosts(@Request() req: any, @Query('cursor') cursor?: string) {
		return this.postClient.send({ cmd: 'get_posts' }, { userId: req.user.id, cursor })
	}

	@Get("post/:user_id")
	async getUserPosts(@Param("user_id") userId: string, @Query('cursor') cursor?: string) {
		return this.postClient.send({ cmd: 'get_user_posts' }, { userId, cursor })
	}

	@Get("comment/:post_id")
	async getComments(@Param("post_id") postId: string, @Query('cursor') cursor?: string) {
		return this.postClient.send({ cmd: 'get_comments' }, { postId, cursor })
	}

	@Post("post")
	async createPost(@Body() body: any, @Request() req: any) {
		const payload = {
			...req.user,
			...body,
		};
		console.log(payload)
		return this.postClient.send({ cmd: "create_post" }, payload)
	};

	@Post("post/:post_id")
	// @UseInterceptors(FilesInterceptor("files", 4, {
	// 	fileFilter,
	// 	storage: post,
	// }))
	async createComment(@UploadedFiles() files: MulterFile[], @Body() body: PostDto, @Param("post_id") postId: string, @Request() req: any) {
		const payload = {
			...req.user,
			...body,
			postId: postId,
			// file: files.length >= 1 ? files.slice(0, 4) : null,
		};
		return this.postClient.send({ cmd: "create_comment" }, payload)
	};

	@Post("post/:post_id/like")
	async likePost(@Param("post_id") postId: string, @Request() req: any) {
		return this.postClient.send({ cmd: "like_post" }, { postId, userId: req.user.id })
	};

	@Post("comment/:comment_id/like")
	async likeComment(@Param("comment_id") commentId: string, @Request() req: any) {
		return this.postClient.send({ cmd: "comment_post" }, { commentId, userId: req.user.id })
	};

	@Delete("post/:post_id/delete")
	async deletePost(@Param("post_id") postId: string, @Request() req: any) {
		return this.postClient.send({ cmd: "delete_post" }, { postId, userId: req.user.id })
	}
}

@Controller('user')
export class UserController {
	constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) { }

	@Public() //move to authservice
	@Post("refresh-access-token")
	async refreshAccessToken(@Body() body: any) {
		return this.userClient.send({ cmd: "refresh-access-token" }, body)
	}
	@Public()
	@Get("verify-email")
	async verifyEmail(@Query("token") token: string) {
		return this.userClient.send({ cmd: "verify_user_email" }, token)
	}

	@Get(':id')
	async getUserById(@Param('id') id: string) {
		return this.userClient.send({ cmd: 'get_user_by_id' }, id);
	}

	@Get('public-key/:id')
	async getPublicKey(@Param('id') id: string) {
		return this.userClient.send({ cmd: 'get_user_public_key' }, id);
	}

	@Public()
	@Post("sign-up")
	async signUp(@Body() body: SignUpDto) {
		return this.userClient.send({ cmd: 'sign_up' }, body);
	}

	@Public()
	@Post("login")
	async login(@Body() body: LoginDto) {
		return this.userClient.send({ cmd: 'login' }, body);
	}

	@Post("verify-email")
	async verifyEmaiiExists(@Body() body: EmailDto) {
		return this.userClient.send({ cmd: "verify_this_email_exists" }, body);
	}

	@Post("verify-numbers")
	async verifyPhoneNumbers(@Request() req: any, @Body() body: PhoneNumbersDto) {
		const userId = req.user.id
		const phoneNumbers = body.phoneNumbers
		return this.userClient.send({ cmd: "verify_phone_numbers" }, { phoneNumbers, userId });
	}

	@Post("profile-img")
	async getUserProfileImg(@Body() body: any) {
		return this.userClient.send({ cmd: "get_user_profile_img" }, body);
	}

	@Patch("domain/:domain_id")
	async exitDomain(@Param("domain_id") domainId: string, @Request() req: any) {
		const userId = req.user.id
		return this.userClient.send({ cmd: "exit_domain" }, { domainId, userId })
	}

	@Patch("sector/:sector_id")
	async removeUser(@Param("sector_id") sectorId: string, @Body() body: any) {
		return this.userClient.send({ cmd: "exit_sector" }, { sectorId, body })
	}

	@Patch("sector/user/:sector_id")
	async addUserToSector(@Param("sector_id") sectorId: string, @Body() body: any) {
		return this.userClient.send({ cmd: "add_user_to_sector" }, { sectorId, body })
	}

	@Patch("sector/:sector_id/user")
	async joinPublicSector(@Param("sector_id") sectorId: string, @Request() req: any) {
		const userId = req.user.id
		return this.userClient.send({ cmd: "join_public_sector" }, { sectorId, userId })
	}
}

@Controller('files')
export class FilesController {
	constructor(
		private readonly filesService: FilesService
	) { }

	@Get("test")
	async test() {
		return { message: true }
	}

	@Post('init')
	async initUpload(@Body() dto: InitUploadDto) {
		return this.filesService.initUpload(dto);
	}

	/**
	 * Streams one encrypted chunk to disk. The chunk's wire format
	 * ([iv][ciphertext][authTag]) is opaque to the server — it just stores
	 * bytes, it never decrypts.
	 */
	@Put(':uploadId/chunks/:index')
	async receiveFile(
		@Param('uploadId') uploadId: string,
		@Param('index', ParseIntPipe) index: number,
		@Req() req: Requesttttt,
	): Promise<{ received: number }> {
		const destPath = this.filesService.chunkPath(uploadId, index);
		const tmpPath = `${destPath}.part`;

		try {
			await pipeline(req, fs.createWriteStream(tmpPath));
		} catch (err) {
			await fs.promises.unlink(tmpPath).catch(() => { });
			throw new BadRequestException(`Failed to write chunk ${index}: ${err}`);
		}

		// Atomic rename so a half-written file is never mistaken for a complete chunk.
		await fs.promises.rename(tmpPath, destPath);
		this.filesService.markChunkReceived(uploadId, index);

		return { received: index };
	}

	@Post(':uploadId/complete')
	async completeUpload(
		@Param('uploadId') uploadId: string,
		@Body() dto: CompleteUploadDto,
	) {
		this.filesService.completeUpload(uploadId, dto);
		return { status: 'complete' };
	}

	@Get(':uploadId/manifest')
	async getManifest(@Param('uploadId') uploadId: string) {
		return this.filesService.getManifest(uploadId);
	}

	@Get(':uploadId/status')
	async getStatus(@Param('uploadId') uploadId: string) {
		return { missingChunks: this.filesService.getMissingChunks(uploadId) };
	}

	@Get(':uploadId/chunks/:index')
	async sendChunk(
		@Param('uploadId') uploadId: string,
		@Param('index', ParseIntPipe) index: number,
		@Res() res: Response,
	): Promise<void> {
		const chunkPath = this.filesService.chunkPath(uploadId, index);
		res.setHeader('Content-Type', 'application/octet-stream');
		await pipeline(fs.createReadStream(chunkPath), res);
	}

	@Get("signature/:id")
	async getUploadSigntaure(@Param("id") id: string, @Request() req: any) {
		const userId = req.user.id
		return this.filesService.generateSignature({ userId, id })
	}
}
