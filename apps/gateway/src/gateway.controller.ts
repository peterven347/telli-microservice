import { Body, Controller, Get, Param, Post, Inject, Query, Patch, UploadedFile, UseInterceptors, UploadedFiles, } from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto, PostDto } from '@app/dtos/auth.dto';
import { File as MulterFile } from 'multer';
//cls & npm run start:dev --watch gateway
const storage1 = diskStorage({
	destination: './uploads/domainLogo',
	filename: (req, file, cb) => {
		const fileExtension = `${extname(file.originalname)}`;
		cb(null, Date.now().toString() + '-' + file.originalname)
	},
});

const chat = diskStorage({
	destination: './uploads/chat',
	filename: (req, file, cb) => {
		const fileExtension = `${extname(file.originalname)}`;
		cb(null, file.originalname)
		// cb(null, Date.now().toString() + '-' + file.originalname)
	},
});

const storage3 = diskStorage({
	destination: './uploads/post',
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
		cb(null, false)
	}
}

@Controller()
export class AuthController {
	// constructor(private readonly userService: AuthService) { }
}

@Controller('call')
export class CallController {
	// constructor(@Inject('CALL_SERVICE') private readonly userClient: ClientProxy) { }
	// constructor(private readonly userService: UserService) { }
}

@Controller('chat')
export class ChatController {
	constructor(@Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy) { }

	@Get("domain")
	async getDomain() {
		return this.chatClient.send({ cmd: "get_domain" }, {})
	};

	@Get("domain/:sector_id")
	async getDomainBySector(@Param("sector_id") sectorId: string) {
		return this.chatClient.send({ cmd: "get_domain_by_sector" }, sectorId)
	};

	@Get("message/:sector_id/:skip")
	async getMissedMessages(@Param("sector_id") sectorId: string, @Param("skip") skip: number) {
		return this.chatClient.send({ cmd: "get_missed_messages" }, { sectorId, skip })
	};

	@Get("sector")
	async searchSectorByTitle(@Query("q") sectorTitle: string) {
		return this.chatClient.send({ cmd: "find_sector_to_join" }, sectorTitle)
	};

	@Post("domain")
	@UseInterceptors(FileInterceptor('file', {
		fileFilter,
		storage: storage1,
		// limits: { fileSize: 10 * 1024 * 1024 }, //10MB
	}))
	async createNewDomain(@UploadedFile() file: MulterFile, @Body() body: any) {
		const payload = {
			...body,
			file: file ?? null,
		};
		return this.chatClient.send({ cmd: "create_domain" }, payload)
	};

	@Post("sector")
	@UseInterceptors(FileInterceptor('file', {
		fileFilter,
		storage: storage1,
		// limits: { fileSize: 10 * 1024 * 1024 }, //10MB
	}))
	async createNewSector(@UploadedFile() file: MulterFile, @Param("domain_id") domainId: string, @Body() body: any) {
		const payload = {
			...body,
			file: file ?? null,
		};
		return this.chatClient.send({ cmd: "create_sector" }, { domainId, payload })
	};

	@Post("message/:sector_id")
	@UseInterceptors(FileInterceptor('file', {
		fileFilter: chatFileFilter,
		// storage: chat,
	}))
	async uploadFileinChat(@UploadedFile() file: MulterFile) {
		return { success: true }
	};

	@Patch("/domain/:domain_id/q")
	async changeDomainHolder(@Param("domain_id") domainId: string, @Query("q") q: string, @Body() body: any) {
		return this.chatClient.send({ cmd: "change_domain_holder" }, { domainId, q, body })
	};

	@Patch("/sector/:sector_id/:domain_id")
	async changeSectorName(@Param("sector_id") sectorId: string, @Param("domain_id") domainId: string, @Body() body: any) {
		return this.chatClient.send({ cmd: "change_sector_name" }, { sectorId, domainId, body })
	};

	@Get("post")
	async createPost(@Body() body: any) {
		console.log("hit...")
		return {}
	}
}

@Controller('post')
export class PostController {
	constructor(@Inject('POST_SERVICE') private readonly postClient: ClientProxy) { }

	@Get("post")
	async getPosts(@Query('cursor') cursor?: string) {
		return this.postClient.send({ cmd: 'get_posts' }, { cursor })
	}

	@Post("post")
	@UseInterceptors(FilesInterceptor("files", 4, {
		fileFilter,
		storage: storage3,
	}))
	async createPost(@UploadedFiles() files: MulterFile[], @Body() body: PostDto) {
		console.log(body.text)
		const payload = {
			...body,
			file: files.length >= 1 ? files : null,
		};
		return this.postClient.send({ cmd: "create_post" }, payload)
	};
}

@Controller('user')
export class UserController {
	constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) { }

	@Get("verify-email")
	async verifyEmail(@Query("token") token: string) {
		return this.userClient.send({ cmd: "verify_user_email" }, token)
	}

	@Get(':id')
	async getUserById(@Param('id') id: string) {
		return this.userClient.send({ cmd: 'get_user_by_id' }, id);
	}

	@Post("sign-up")
	async signUp(@Body() body: SignUpDto) {
		return this.userClient.send({ cmd: 'sign_up' }, body);
	}

	@Post("login")
	async login(@Body() body: LoginDto) {
		return this.userClient.send({ cmd: 'login' }, body);
	}

	@Post("refresh-access-token")
	async refreshAccessToken(@Body() body: any) {
		return this.userClient.send({ cmd: "refresh_access_token" }, body)
	}

	@Post("verify-email")
	async verifyEmaiiExists(@Body() body: EmailDto) {
		return this.userClient.send({ cmd: "verify_this_email_exists" }, body);
	}

	@Post("verify-numbers")
	async verifyPhoneNumbers(@Body() body: PhoneNumbersDto) {
		return this.userClient.send({ cmd: "verify_phone_numbers" }, body);
	}

	@Post("profile-img")
	async getUserProfileImg(@Body() body: any) {
		return this.userClient.send({ cmd: "get_user_profile_img" }, body);
	}

	@Patch("/user/domain/:domain_id")
	async exitDomain(@Param("domain_id") domainId: string) {
		return this.userClient.send({ cmd: "exit_domain" }, domainId)
	}

	@Patch("/user/sector/:sector_id")
	async removeUser(@Param("sector_id") sectorId: string, @Body() body: any) {
		return this.userClient.send({ cmd: "exit_sector" }, { sectorId, body })
	}

	@Patch("/user/sector/:sector_id/users")
	async addUserToSector(@Param("sector_id") sectorId: string, @Body() body: any) {
		return this.userClient.send({ cmd: "add_user_to_sector" }, { sectorId, body })
	}

	@Patch("/user/sector/:sector_id/users")
	async joinPublicSector(@Param("sector_id") sectorId: string) {
		return this.userClient.send({ cmd: "join_public_sector" }, { sectorId })
	}
}

//cls & npm run start:dev --watch gateway