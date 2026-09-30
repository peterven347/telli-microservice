<<<<<<< HEAD
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto } from "@app/dtos/dto"
=======
import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto } from "@app/dtos/auth.dto"
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348

@Controller()
export class UserController {
	constructor(private readonly userService: UserService) { }

<<<<<<< HEAD
	@MessagePattern({ cmd: 'refresh-access-token' })
	async handleAccessToken(body: any) {
		return this.userService.refreshAccessToken(body);
	}

=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	@MessagePattern({ cmd: 'sign_up' })
	async handleSignUp(body: SignUpDto) {
		return this.userService.signUp(body);
	}

	@MessagePattern({ cmd: 'login' })
	async handleLogin(body: LoginDto) {
		return this.userService.login(body);
	}

<<<<<<< HEAD
=======
	@MessagePattern({ cmd: "refresh_access_token" })
	async handleRefreshToken(body: any) {
		return this.userService.refreshAccessToken(body)
	}

>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	@MessagePattern({ cmd: "verify_user_email" })
	async handleEmailVerification(token: string) {
		return this.userService.verifyUserEmail(token)
	}

	@MessagePattern({ cmd: 'get_user_by_id' })
	async handleGetUserById(id: string) {
		return this.userService.getUserById(id);
	}

<<<<<<< HEAD
	@MessagePattern({ cmd: 'get_user_public_key' })
	async handleGetUserPublicKey(id: string) {
		return this.userService.getUserPublicKey(id);
	}

=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	@MessagePattern({ cmd: 'get_user_profile_img' })
	async handleGetUserProfileImg(body: any) {
		return this.userService.getUserProfileImg(body);
	}

	@MessagePattern({ cmd: "verify_this_email_exists" })
	async handleEmailConfirmation(body: EmailDto) {
		return this.userService.verifyThisEmail(body)
	}

	@MessagePattern({ cmd: "verify_phone_numbers" })
<<<<<<< HEAD
	async handleVerifyPhoneNumbers(data) {
		return this.userService.verifyPhoneNumbers(data.phoneNumbers, data.userId)
=======
	async handleVerifyPhoneNumbers(body: PhoneNumbersDto, userId: string) {
		return this.userService.verifyPhoneNumbers(body, userId)
	}

	@MessagePattern({ cmd: "exit_domain" })
	async handleExitDomain(domainId: string, userId: string) {
		return this.userService.exitDomain(domainId, userId)
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	}

	@MessagePattern({ cmd: "exit_sector" })
	async handleRemoveUser(sectorId: string, body: any) {
		return this.userService.removeUser(sectorId, body)
	}

	@MessagePattern({ cmd: "add_user_to_sector" })
	async handleAddUserToSector(sectorId: string, body: any) {
		return this.userService.addUserToSector(sectorId, body)
	}

	@MessagePattern({ cmd: "join_public_sector" })
	async handleJoinPublicSector(sectorId: string, userId: string) {
		return this.userService.joinPublicector(sectorId, userId)
	}

<<<<<<< HEAD
	@Get('find-one/id/:user_id')
	async findById(@Param("user_id") userId: string) {
		return this.userService.findOneById(userId);
	}

	@Get('find-one/email/:email')
	async findByEmail(@Param("email") email: string) {
		// const { email, select= "" } = query;
		const select = ""
		return this.userService.findOneByEmail(email, select);
	}

	@Post('find-by-list')
	async findByList(@Body("list") list) {
		return this.userService.findByList(list);
	}

	@Patch('exit-sector')
	async exitSector(@Body() body) {
		const { sectorId, userId } = body
		return this.userService.exitSector(sectorId, userId);
	}

	@Patch('exit-domain')
	async exitDomain(@Body() body) {
		const { sectorIds, userId } = body
		return this.userService.exitDomain(sectorIds, userId);
	}

	@Patch('update-many')
	async updateMany(@Body() body) {
		const { users, sectorId } = body
		return this.userService.updateMany(users, sectorId);
=======
	//
	@Get('find-one')
	async findOne(@Query() query: any) {
		const { email, select } = query;
		return this.userService.findOne(
			{ email },
			select,
		);
	}

	@Patch('update-many')
	async updateMany(@Body() body: { filter: any; update: any }) {
		const { filter, update } = body;
		return this.userService.updateMany(filter, update);
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	}

}
