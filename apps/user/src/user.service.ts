import * as bcrypt from 'bcryptjs';
import { Injectable, NotFoundException, ConflictException, Body, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model, PipelineStage, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import { EmailDto, LoginDto, SignUpDto } from '@app/dtos/dto';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { HttpService } from '@nestjs/axios';
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import { MailService } from './mail/mail.service';
import { User } from "./user.schema";

function generateToken(jwtService: JwtService, payload: any, options?: SignOptions): string {
	return jwtService.sign(payload, options);
};

function verifyToken(jwtService: JwtService, payload: any, options?: SignOptions): any {
	return jwtService.verify(payload, options);
};

function normalizePhoneNumber(input: string, default_country: CountryCode = "NG"): string | null {
	const phone = parsePhoneNumberFromString(input, default_country);
	if (!phone || !phone.isValid()) {
		return null;
	}
	return phone.number;
}

const opts = {
	key: "USERNAMES",
	expectedItems: 100000,
	falsePositiveRate: 0.01
}

@Injectable()
export class UserService {
	constructor(
		@InjectModel(User.name) private userModel: Model<User>,
		@Inject("REDIS_CLIENT") private readonly redisClient: Redis,
		private readonly httpService: HttpService,
		private readonly mailService: MailService,
		private jwtService: JwtService,
		private configService: ConfigService,

	) { }

	async onModuleInit() {
		try {
			await this.redisClient.call(
				'BF.RESERVE', opts.key,
				String(opts.falsePositiveRate), String(opts.expectedItems),
			);
		} catch (e: any) {
			if (!String(e.message).includes('item exists')) throw e;
		}
	};

	// async testadd(value: string) {
	// 	const rr = await this.redisClient.call('BF.ADD', opts.key, value)
	// 	console.log(rr)
	// }

	// async testexist(value: string) {
	// 	const result = await this.redisClient.call(
	// 		"BF.EXISTS",
	// 		opts.key,
	// 		value,
	// 	);
	// 	console.log(result);
	// }

	async refreshAccessToken(body: any) {
		try {
			const decoded = verifyToken(this.jwtService, body.refreshToken)
			const accessToken = generateToken(this.jwtService,
				{ id: decoded.id, email: decoded.email, userName: decoded.user_name },
				{ expiresIn: "30m" }
			)
			return { success: true, accessToken: accessToken }
		} catch (err: any) {
			if (err) {
				if (err.name === "TokenExpiredError") return { success: false, message: "TokenExpiredError" }
				console.log(err.name)
				return { success: false, message: "auth error" }
			}
		}
	};

	async getDelegates(delegates: string, id: any) {
		const isNumeric = (i: string) => /^\+?\d+$/.test(i)
		const _delegates = delegates.split(",")
		const delegateList: string[] = []
		let delegateFcmToken: string[] = []
		for (let i of _delegates) {
			const user = isNumeric(i) ? await this.userModel.findOne({ phone_number: normalizePhoneNumber(i,) }) : await this.userModel.findOne({ email: i })
			if (user !== null && user.id !== id) {
				delegateList.push(user.id)
				delegateFcmToken = delegateFcmToken.concat(user?.fcmTokens)
			}
		}
		return ({ delegateList: delegateList, delegateFcmToken: delegateFcmToken })
	};

	async searchUsers(payload: any) {
		const { userId, text } = payload
		const limit = 15
		const query = text?.trim();

		if (!query || query.length < 2) {
			return { users: [] };
		}

		const users = await this.userModel.aggregate([
			{
				$search: {
					index: 'users_search',
					autocomplete: {
						query,
						path: 'user_name',
						fuzzy: { maxEdits: 1, prefixLength: 2 },
					},
				},
			},
			{ $match: { _id: { $ne: new Types.ObjectId(userId) } } },
			{ $limit: limit },
			{
				$project: {
					user_name: 1,
					bio: 1,
					score: { $meta: 'searchScore' },
				},
			},
		]);

		return { users };
	};

	async getUserById(id: string): Promise<User> {
		const user = await this.userModel.findById(id)
		if (!user) {
			throw new NotFoundException(`User with id ${"id"} not found`);
		}
		return user;
	};

	async getUserPublicKey(id: string): Promise<User> {
		const user = await this.userModel.findById(id).select({ publicKey: 1 })
		if (!user) {
			throw new NotFoundException(`User with id ${"id"} not found`);
		}
		return user;
	};

	async checkUserName(value: string) {
		const userNameExists = await this.redisClient.exists(`TEMP_USERNAMES:${value}`) || await this.redisClient.call("BF.EXISTS", opts.key, value);
		if (userNameExists) {
			const dbCheck = this.userModel.findOne({ user_name: value })
			if (!dbCheck) return ({ success: true, message: "" })
			return ({ success: false, message: "user name already exists" })
		} else {
			return ({ success: true, message: "" })
		}
	};

	async signUp(body: SignUpDto) {
		const { email, user_name, password } = body
		const userName = user_name.trim().toLowerCase()
		const url_domain = this.configService.get<string>("URL_DOMAIN")
		try {
			const existingMail = await this.redisClient.exists(`PENDING_EMAILS:${email}`) || await this.userModel.exists({ email });
			if (existingMail) return ({ success: false, message: "email already exists" });
			// if (existingUser) throw new ConflictException('email already exists');

			const userNameExists = await this.redisClient.exists(`TEMP_USERNAMES:${userName}`) || await this.redisClient.call("BF.EXISTS", opts.key, userName);
			if (userNameExists) {
				return ({ success: false, message: "user name already exists" })
			} else {
				await this.redisClient.set(`TEMP_USERNAMES:${userName}`, userName, "EX", 600);
			}

			const hashedPassword = await bcrypt.hash(password, 10)
			const newUser = new this.userModel({
				...body,
				password: hashedPassword,
			});

			await this.redisClient.set(`PENDING_EMAILS:${email}`, JSON.stringify(newUser), "EX", 240);

			const token = generateToken(this.jwtService,
				{ id: newUser.id, email: email, userName: userName },
				{ expiresIn: '5m' }
			);
			const tt = await this.mailService.sendMail(
				email,
				"Verify your mail",
				"",
				`<p>Welcome! <a href="${url_domain}/user/verify-email?token=${token}">click to verify</a></p>`
			);
			return ({ success: true })
		} catch (err) {
			console.log(err)
			// await this.redisClient.del(`PENDING_EMAILS:${email}`)
			return ({ success: false, message: "an error occured" })
		}
	};

	async verifyUserEmail(token: string) {
		try {
			const payload = this.jwtService.verify(token)
			const email = payload.email
			const userData = await this.redisClient.get(`PENDING_EMAILS:${email}`);
			const user = userData ? JSON.parse(userData) : null;
			if (user) {
				const newUser = new this.userModel(user);
				await this.redisClient.call('BF.ADD', opts.key, user.user_name)
				await this.redisClient.del(`PENDING_EMAILS:${email}`)
				await newUser.save();
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
				{ id: user.id, email: user.email, userName: user.user_name },
				{ expiresIn: "50m" }
			)
			// save refreshToken to redis here
			const refreshToken = generateToken(this.jwtService,
				{ id: user.id, email: user.email, userName: user.user_name },
				{ expiresIn: "8h" }
			)
			const userObject = user.toObject()
			const { password, fcmTokens, ...rest } = userObject;
			// await this.mailService.sendMail(
			// 	email,
			// 	"Login Detected",
			// 	"",
			// 	`<p>Take action if this was not you</p>`
			// );

			if (!user.fcmTokens.includes(fcmToken)) {
				user.fcmTokens.push(fcmToken);
				if (user.fcmTokens.length > 3) {
					user.fcmTokens = user.fcmTokens.slice(user.fcmTokens.length - 3);
				}
				await user.save();
			}
			return { success: true, accessToken: accessToken, refreshToken: refreshToken, user: rest }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
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

	async verifyPhoneNumbers(phoneNumbers: string[], userId: string) {
		try {
			const valid = (await Promise.all(
				phoneNumbers.map(async (i: string) => {
					const result = await this.userModel.findOne({ phone_number: normalizePhoneNumber(i), _id: { $ne: userId } });
					return result && { _id: result.id, number: i, publicKey: result.publicKey };
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
				return { success: true, data: { phoneNumber: body.phoneNumber } }
			} else {
				return { success: false, message: "non found" }
			}
		} catch (err) {
			console.log(err)
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
				const person: any = isNumeric(i) ? await this.userModel.findOne({ phone_number: normalizePhoneNumber(i) }) : await this.userModel.findOne({ email: i })
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
								members: { _id: user?._id, user_name: user?.user_name, isAdmin: false },
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
								members: { _id: user._id, user_name: user.user_name, isAdmin: false },
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

	async findOneById(userId: string) {
		return await this.userModel.findById(userId)
	};

	async findOneByEmail(email: string, select = "") {
		return await this.userModel.findOne({ email: email }).select(select)
	};

	async findByList(list: string[]) {
		const users = await this.userModel.find(
			{
				$or: [{ email: { $in: list } }, { phone_number: { $in: list } }]
			},
			{
				_id: 1, user_name: 1, fcmTokens: 1
			}
		);
		return users
	};

	async exitSector(sectorId: string, userId: string) {
		try {
			await this.userModel.updateOne(
				{ _id: userId },
				{ $pull: { sectors: sectorId } }
			);
			return { success: true, message: "removed from sector" }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async exitDomain(sectorIds, userId: string) {
		try {
			await this.userModel.updateOne(
				{ _id: userId },
				{ $pull: { sectors: { $in: sectorIds } } }
			);
			return { success: true, message: "removed from domain" }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

	async updateMany(users, sectorId) {
		await this.userModel.updateMany(
			{ _id: { $in: users } },
			{
				$addToSet: {
					sectors: sectorId,
				},
			},
		)
	};

	// async test() {
	// 	console.log("test completed")
	// 	return {success: true}
	// };
}
