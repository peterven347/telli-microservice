import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto } from "@app/dtos/auth.dto"

@Controller()
export class UserController {
	constructor(private readonly userService: UserService) { }

	@MessagePattern({ cmd: 'sign_up' })
	async handleSignUp(body: SignUpDto) {
		return this.userService.signUp(body);
	}

	@MessagePattern({ cmd: 'login' })
	async handleLogin(body: LoginDto) {
		return this.userService.login(body);
	}

	@MessagePattern({ cmd: "refresh_access_token" })
	async handleRefreshToken(body: any) {
		return this.userService.refreshAccessToken(body)
	}

	@MessagePattern({ cmd: "verify_user_email" })
	async handleEmailVerification(token: string) {
		return this.userService.verifyUserEmail(token)
	}

	@MessagePattern({ cmd: 'get_user_by_id' })
	async handleGetUserById(id: string) {
		return this.userService.getUserById(id);
	}

	@MessagePattern({ cmd: 'get_user_profile_img' })
	async handleGetUserProfileImg(body: any) {
		return this.userService.getUserProfileImg(body);
	}

	@MessagePattern({ cmd: "verify_this_email_exists" })
	async handleEmailConfirmation(body: EmailDto) {
		return this.userService.verifyThisEmail(body)
	}

	@MessagePattern({ cmd: "verify_phone_numbers" })
	async handleVerifyPhoneNumbers(body: PhoneNumbersDto, userId: string) {
		return this.userService.verifyPhoneNumbers(body, userId)
	}

	@MessagePattern({ cmd: "exit_domain" })
	async handleExitDomain(domainId: string, userId: string) {
		return this.userService.exitDomain(domainId, userId)
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
	}

}
