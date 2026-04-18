import { Injectable, NotFoundException, ConflictException, Body, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcryptjs';
import * as os from 'os';
import { MailService } from './mail/mail.service';
import { User } from "@app/schemas/user.schema";
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto } from '@app/dtos/auth.dto';
import { country_dial_codes } from 'country-dial-codes';
import { REDIS_CLIENT } from 'apps/redis/redis.constants';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { HttpService } from '@nestjs/axios';
import { Public } from 'apps/gateway/src/auth/jwt-auth.guard';

const pendingEmailsMap = new Map<string, any>();
const url_domain = `http://${getLocalIPAddress()}:3000`

function generateToken(jwtService: JwtService, payload: any, options?: SignOptions): string {

	return jwtService.sign(payload, options);
};

function verifyToken(jwtService: JwtService, payload: any, options?: SignOptions): any {
	return jwtService.verify(payload, options);
};

function cleanPhoneNumber(input: string) {
	const number = input.trim().replace(/\D/g, '');
	for (const i of country_dial_codes) {
		if (number.startsWith(i)) {
			return number.replace(i, '');
		}
	}
	if (number.startsWith("0")) {
		return number.slice(1);
	}
	return number;
};

function getLocalIPAddress(): string {
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		const ifaceList = interfaces[name];
		if (!ifaceList) continue;
		for (const iface of ifaceList) {
			if (iface.family === 'IPv4' && !iface.internal) {
				return iface.address;
			}
		}
	}

	return '127.0.0.1';
};

@Injectable()
export class UserService {
	constructor(
		@InjectModel(User.name) private userModel: Model<User>,
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		private readonly httpService: HttpService,
		private readonly mailService: MailService,
		private jwtService: JwtService,
	) { }

	async getDelegates (delegates: string, id: any){
		const isNumeric = (i: string) => /^\+?\d+$/.test(i)
		const _delegates = delegates.split(",")
		const delegateList: string[] = []
		let delegateFcmToken: string[] = []
		for (let i of _delegates) {
			const user = isNumeric(i) ? await this.userModel.findOne({ phone_number: cleanPhoneNumber(i) }) : await this.userModel.findOne({ email: i })
			if (user !== null && user.id !== id) {
				delegateList.push(user.id)
				delegateFcmToken = delegateFcmToken.concat(user?.fcmTokens)
			}
		}
		return ({ delegateList: delegateList, delegateFcmToken: delegateFcmToken })
	};

	async getUserById(id: string): Promise<User> {
		const user = await this.userModel.findById(id)
		if (!user) {
			throw new NotFoundException(`User with id ${"id"} not found`);
		}
		return user;
	};

	@Public()
	async signUp(body: SignUpDto) {
		const { email, password } = body
		try {
			const existingUser = pendingEmailsMap.has(email) || await this.userModel.exists({ email });
			if (existingUser) return ({ success: false, message: "email already exists" });
			// if (existingUser) throw new ConflictException('email already exists');

			const hashedPassword = await bcrypt.hash(password, 10)
			const newUser = new this.userModel({
				...body,
				password: hashedPassword,
			});

			// await newUser.save();
			pendingEmailsMap.set(email, newUser); //use redis instead

			const token = generateToken(this.jwtService,
				{ id: newUser.id, email: email },
				{ expiresIn: '5m' }
			);

			await this.mailService.sendMail(
				email,
				"Verify your mail",
				"",
				`<p>Welcome! <a href="${url_domain}/user/verify-email?token=${token}">click to verify</a></p>`
			);
			return ({ success: true })
		} catch (err) {
			console.log(err)
			return ({ success: false, message: "an error occured" })
		}
	};

	async verifyUserEmail(token: string) {
		try {
			const payload = this.jwtService.verify(token)
			const email = payload.email
			let user = pendingEmailsMap.get(email)
			if (user) {
				await user.save()
				pendingEmailsMap.delete(email)
				return "Your email has been verified!, go back and login"
			} else {
				const saved = await this.userModel.findOne({ email: payload.email })
				if (saved) {
					return "Your email has already been verified!, go back and login"
				} else {
					return "Please complete sign up - click here"
				}
			}
		} catch (err) {
			console.log(err)
			return "an error occured, please try again later."
		}
	};

	async login(body: LoginDto) {
		const { email, fcmToken } = body
		try {
			const user: any = await this.userModel.findOne({ email: email })
			if (!user) return { success: false, message: "user does not exist" }

			const isMatch = await bcrypt.compare(body.password, user.password);
			if (!isMatch) {
				return { success: false, message: "Incorrect password" };
			}

			const accessToken = generateToken(this.jwtService,
				{ id: user.id, email: user.email },
				{ expiresIn: "50m" }
			)
			// save refreshToken to redis here
			const refreshToken = generateToken(this.jwtService,
				{ email: user.email, first_name: user.first_name },
				{ expiresIn: "8h" }
			)
			const userObject = user.toObject()
			const { password, fcmTokens, ...rest } = userObject;
			// await this.mailService.sendMail(
			// 	email,
			// 	"Login Detected",
			// 	"",
			// 	`<p>Take action if this wasnt you</p>`
			// );

			if (!user.fcmTokens.includes(fcmToken)) {
				user.fcmTokens.push(fcmToken);
				if (user.fcmTokens.length > 3) {
					user.fcmTokens = user.fcmTokens.slice(user.fcmTokens.length - 3);
				}
				await user.save();
			}
			let tokens = user.fcmTokens.filter(i => i !== fcmToken)
			const message = {
				tokens: tokens,
				notification: {
					title: "Login detected",
					body: "Your account has been logged in on another device",
				},
			}
			// tokens.length >= 1 && fadmin.messaging().sendEachForMulticast(message)
			return { success: true, accessToken: accessToken, refreshToken: refreshToken, user: rest }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async refreshAccessToken(body: any) {
		try {
			const decoded = verifyToken(this.jwtService, body.refreshToken)
			const userSocketId = await this.redis.hget("usersSockets", decoded.id)
			console.log(userSocketId)
			// const socket = userNameSpace.sockets.get(userSocketId);
			// if (socket) {
			// 	socket.disconnect(true)
			// }
			const accessToken = generateToken(this.jwtService,
				{ email: decoded.email, first_name: decoded.first_name },
				{ expiresIn: "50m" }
			)
			return { success: true, accessToken: accessToken }
		} catch (err: any) {
			if (err) {
				if (err.name === "TokenExpiredError") return { success: false, message: "log in" }
				console.log(err.name)
				return { success: false, message: "auth error" }
			}
		}
	};

	async verifyThisEmail(body: EmailDto) {
		const { email } = body
		try {
			const user = await this.userModel.findOne({ email: email.toLowerCase() })
			if (!user) return { email: email, message: "notExist" }
			return { email: email, message: "exists" }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async verifyPhoneNumbers(body: PhoneNumbersDto, userId: string) {
		try {
			const valid = (await Promise.all(
				body.phoneNumbers.map(async (i: string) => {
					const result = await this.userModel.findOne({ $and: [{ phone_number: cleanPhoneNumber(i) }, { _id: { $ne: userId } }] });
					return result && { _id: result.id, number: i, img: result.img, publicKey: result.publicKey };
				})
			)).filter(Boolean)
			return { success: true, data: valid }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async getUserProfileImg(body: any) {
		try {
			const user = await this.userModel.findOne({ phone_number: body.phoneNumber }).select("-_id img")
			if (user) {
				return { success: true, data: { img: user?.img, phoneNumber: body.phoneNumber } }
			} else {
				return { success: false, message: "non found" }
			}
		} catch (err) {
			console.log(err)
		}
	};

	async exitDomain(domainId: string, userId: string) {
		try {
			const user: any = await this.userModel.findById(userId)
			const response = await lastValueFrom(
				this.httpService.get(
					`http://localhost:3002/domain/${domainId}`
				)
			);
			const domain = response.data
			if (!user || !domain) return { success: false, message: "not found" }
			if (user._id.equals(domain.creator_id)) return { success: false, message: "creator" }
			await this.userModel.updateOne(
				{ _id: user?._id },
				{ $pull: { sectors: { domain_id: domainId } } }
			);
			return { success: true, message: "removed from domain" }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async removeUser(sectorId: string, body: any) {
		try {
			const person = await this.userModel.findOne({ phone_number: body.delegate }, { _id: 1 })
			const user = await this.userModel.findOne({ email: body.email }, { _id: 1 })
			const response = await lastValueFrom(
				this.httpService.get(
					`http://localhost:3002/sector/${sectorId}`,
					{
						params: { _id: 0, creator_id: 1, domain_id: 1 },
					}
				)
			);

			const sector = response.data;
			// if (user._id.equals(sector?.creator_id)) {
			const result = await this.userModel.updateOne(
				{ _id: person?._id },
				{ $pull: { sectors: sectorId } }
			)
			if (result.modifiedCount > 0) {
				return { success: true, message: "delegate removed" }
			} else {
				return { success: false, message: "failed to remove delegate" }
			}
			// } else {
			// 	const domain = await this.domainModel.findById(sector?.domain_id, { _id: 0, creator_id: 1 })
			// 	if (user._id.equals(sector?.domain_id)) {
			// 		const result = await this.userModel.updateOne(
			// 			{ _id: person?._id },
			// 			{ $pull: { sectors: sectorId } }
			// 		)
			// 		if (result.modifiedCount > 0) {
			// 			return { success: true, message: "delegate removed" }
			// 		} else {
			// 			return { success: false, message: "failed to remove delegate" }
			// 		}
			// 	} else {
			// 		return { success: false, message: "unauthorized" }
			// 	}
			// }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async addUserToSector(sectorId: string, body: any) {
		const getDelegates = async (delegates: string, id: any) => {
			const isNumeric = (i: any) => /^\+?\d+$/.test(i)
			const _delegates = delegates.split(",")
			let delegateList = []
			let delegateFcmToken = []
			for (let i of _delegates) {
				const person: any = isNumeric(i) ? await this.userModel.findOne({ phone_number: cleanPhoneNumber(i) }) : await this.userModel.findOne({ email: i })
				if (person && person.id !== id) {
					delegateList = delegateList.concat(person?.id)
					// delegateList.push(person?.id)
					delegateFcmToken = delegateFcmToken.concat(person.fcmTokens)
				}
			}
			return ({ delegateList: delegateList, delegateFcmToken: delegateFcmToken })
		};

		try {
			const response = await lastValueFrom(
				this.httpService.get(
					`http://localhost:3002/sector/${sectorId}`,
					{
						params: { _id: 0, creator_id: 1, domain_id: 1 },
					}
				)
			);

			const sector = response.data;
			if (!sector) return { success: false, "message": "sector not found" }
			const user = await this.userModel.findOne({ email: body.email })
			const { delegateList, delegateFcmToken } = await getDelegates(body.delegates, user?._id)
			const adduser = await this.userModel.updateMany({ _id: { $in: delegateList } }, { $addToSet: { sectors: sector._id } })
			const message = {
				tokens: delegateFcmToken.flat(),
				notification: {
					title: "Telli",
					body: `You have been added to ${sector.title}`,
				},
				data: { sector: JSON.stringify(sector) },
			}
			await lastValueFrom(
				this.httpService.patch(
					`http://localhost:3002/update-one`,
					{
						filter: { _id: sectorId },
						update: {
							$addToSet: {
								members: { user: user?._id, role: 'member' },
							},
						},
					}
				))

			// await fadmin.messaging().sendEachForMulticast(message);
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async joinPublicector(sectorId: string, userId: string) {
		try {
			const response = await lastValueFrom(
				this.httpService.get(
					`http://localhost:3002/${sectorId}/exists`
				)
			);

			const sector = response.data;
			if (!sector) return { success: false, "message": "sector not found" }
			const user = await this.userModel.findByIdAndUpdate(userId, { $addToSet: { sectors: sector._id } })
			if (!user) return { success: false, "message": "user not found" }
			await lastValueFrom(
				this.httpService.patch(
					`http://localhost:3002/update-one`,
					{
						filter: { _id: sectorId },
						update: {
							$addToSet: {
								members: { user: user?._id, role: 'member' },
							},
						},
					}
				))

			// const creatorSocketId = await redis.hGet("userSockets", user.id)
			// const socket = userNameSpace.sockets.get(creatorSocketId);
			// if (socket) {
			// 	socket.join(sector.id);
			// }
			return { success: true, "message": "delegated added successfully" }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async findOne(email, select = "") {
		return await this.userModel.findOne(email).select(select)
	};

	async updateMany(filter, update) {
		return await this.userModel.updateMany(filter, update)
	};
}
