<<<<<<< HEAD
import * as bcrypt from 'bcryptjs';
import * as os from 'os';
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { Injectable, NotFoundException, ConflictException, Body, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
<<<<<<< HEAD
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto } from '@app/dtos/dto';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { HttpService } from '@nestjs/axios';
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import { MailService } from './mail/mail.service';
import { User } from "./user.schema";

const url_domain = `http://localhost:3000`
// const url_domain = `http://${getLocalIPAddress()}:3000`

function generateToken(jwtService: JwtService, payload: any, options?: SignOptions): string {
=======
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

>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	return jwtService.sign(payload, options);
};

function verifyToken(jwtService: JwtService, payload: any, options?: SignOptions): any {
	return jwtService.verify(payload, options);
};

<<<<<<< HEAD

// function cleanPhoneNumber(input: string) {
// 	const number = input.trim().replace(/\D/g, '');
// 	for (const i of country_dial_codes) {
// 		if (number.startsWith(i)) {
// 			return number.replace(i, '');
// 		}
// 	}
// 	if (number.startsWith("0")) {
// 		return number.slice(1);
// 	}
// 	return number;
// };

function normalizePhoneNumber(input: string, default_country: CountryCode = "NG"): string | null {
	const phone = parsePhoneNumberFromString(input, default_country);
	if (!phone || !phone.isValid()) {
		return null;
	}
	return phone.number;
}
=======
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
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348

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
<<<<<<< HEAD
		@Inject("REDIS_CLIENT") private readonly redisClient: Redis,
=======
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
		private readonly httpService: HttpService,
		private readonly mailService: MailService,
		private jwtService: JwtService,
	) { }

<<<<<<< HEAD
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
=======
	async getDelegates (delegates: string, id: any){
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
		const isNumeric = (i: string) => /^\+?\d+$/.test(i)
		const _delegates = delegates.split(",")
		const delegateList: string[] = []
		let delegateFcmToken: string[] = []
		for (let i of _delegates) {
<<<<<<< HEAD
			const user = isNumeric(i) ? await this.userModel.findOne({ phone_number: normalizePhoneNumber(i,) }) : await this.userModel.findOne({ email: i })
=======
			const user = isNumeric(i) ? await this.userModel.findOne({ phone_number: cleanPhoneNumber(i) }) : await this.userModel.findOne({ email: i })
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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

<<<<<<< HEAD
	async getUserPublicKey(id: string): Promise<User> {
		const user = await this.userModel.findById(id).select({ publicKey: 1 })
		if (!user) {
			throw new NotFoundException(`User with id ${"id"} not found`);
		}
		return user;
	};

	async signUp(body: SignUpDto) {
		const { email, user_name, password } = body
		try {
			const existingUser = await this.redisClient.exists(`PENDING_EMAILS:${email}`) || await this.userModel.exists({ email });
=======
	@Public()
	async signUp(body: SignUpDto) {
		const { email, password } = body
		try {
			const existingUser = pendingEmailsMap.has(email) || await this.userModel.exists({ email });
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
			if (existingUser) return ({ success: false, message: "email already exists" });
			// if (existingUser) throw new ConflictException('email already exists');

			const hashedPassword = await bcrypt.hash(password, 10)
			const newUser = new this.userModel({
				...body,
				password: hashedPassword,
			});

<<<<<<< HEAD
			await this.redisClient.set(`PENDING_EMAILS:${email}`, JSON.stringify(newUser), "EX", 240);

			const token = generateToken(this.jwtService,
				{ id: newUser.id, email: email, userName: user_name },
				{ expiresIn: '5m' }
			);
			const tt = await this.mailService.sendMail(
=======
			// await newUser.save();
			pendingEmailsMap.set(email, newUser); //use redis instead

			const token = generateToken(this.jwtService,
				{ id: newUser.id, email: email },
				{ expiresIn: '5m' }
			);

			await this.mailService.sendMail(
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
				email,
				"Verify your mail",
				"",
				`<p>Welcome! <a href="${url_domain}/user/verify-email?token=${token}">click to verify</a></p>`
			);
			return ({ success: true })
		} catch (err) {
			console.log(err)
<<<<<<< HEAD
			// await this.redisClient.del(`PENDING_EMAILS:${email}`)
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
			return ({ success: false, message: "an error occured" })
		}
	};

	async verifyUserEmail(token: string) {
		try {
			const payload = this.jwtService.verify(token)
			const email = payload.email
<<<<<<< HEAD
			const userData = await this.redisClient.get(`PENDING_EMAILS:${email}`);
			const user = userData ? JSON.parse(userData) : null;
			if (user) {
				const newUser = new this.userModel(user);
				await this.redisClient.del(`PENDING_EMAILS:${email}`)
				await newUser.save();
=======
			let user = pendingEmailsMap.get(email)
			if (user) {
				await user.save()
				pendingEmailsMap.delete(email)
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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
<<<<<<< HEAD
				{ id: user.id, email: user.email, userName: user.user_name },
=======
				{ id: user.id, email: user.email },
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
				{ expiresIn: "50m" }
			)
			// save refreshToken to redis here
			const refreshToken = generateToken(this.jwtService,
<<<<<<< HEAD
				{ id: user.id, email: user.email, userName: user.user_name },
=======
				{ email: user.email, first_name: user.first_name },
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
				{ expiresIn: "8h" }
			)
			const userObject = user.toObject()
			const { password, fcmTokens, ...rest } = userObject;
			// await this.mailService.sendMail(
			// 	email,
			// 	"Login Detected",
			// 	"",
<<<<<<< HEAD
			// 	`<p>Take action if this was not you</p>`
=======
			// 	`<p>Take action if this wasnt you</p>`
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
			// );

			if (!user.fcmTokens.includes(fcmToken)) {
				user.fcmTokens.push(fcmToken);
				if (user.fcmTokens.length > 3) {
					user.fcmTokens = user.fcmTokens.slice(user.fcmTokens.length - 3);
				}
				await user.save();
			}
<<<<<<< HEAD
=======
			let tokens = user.fcmTokens.filter(i => i !== fcmToken)
			const message = {
				tokens: tokens,
				notification: {
					title: "Login detected",
					body: "Your account has been logged in on another device",
				},
			}
			// tokens.length >= 1 && fadmin.messaging().sendEachForMulticast(message)
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
			return { success: true, accessToken: accessToken, refreshToken: refreshToken, user: rest }
		} catch (err) {
			console.log(err)
			return { success: false, message: "an error occured" }
		}
	};

<<<<<<< HEAD
=======
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

>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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

<<<<<<< HEAD
	async verifyPhoneNumbers(phoneNumbers: string[], userId: string) {
		try {
			const valid = (await Promise.all(
				phoneNumbers.map(async (i: string) => {
					const result = await this.userModel.findOne({ phone_number: normalizePhoneNumber(i), _id: { $ne: userId } });
					return result && { _id: result.id, number: i, publicKey: result.publicKey };
=======
	async verifyPhoneNumbers(body: PhoneNumbersDto, userId: string) {
		try {
			const valid = (await Promise.all(
				body.phoneNumbers.map(async (i: string) => {
					const result = await this.userModel.findOne({ $and: [{ phone_number: cleanPhoneNumber(i) }, { _id: { $ne: userId } }] });
					return result && { _id: result.id, number: i, img: result.img, publicKey: result.publicKey };
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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
<<<<<<< HEAD
				return { success: true, data: { phoneNumber: body.phoneNumber } }
=======
				return { success: true, data: { img: user?.img, phoneNumber: body.phoneNumber } }
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
			} else {
				return { success: false, message: "non found" }
			}
		} catch (err) {
			console.log(err)
		}
	};

<<<<<<< HEAD
=======
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

>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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
<<<<<<< HEAD
				const person: any = isNumeric(i) ? await this.userModel.findOne({ phone_number: normalizePhoneNumber(i) }) : await this.userModel.findOne({ email: i })
=======
				const person: any = isNumeric(i) ? await this.userModel.findOne({ phone_number: cleanPhoneNumber(i) }) : await this.userModel.findOne({ email: i })
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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
<<<<<<< HEAD
								members: { _id: user?._id, user_name: user?.user_name, isAdmin: false },
=======
								members: { user: user?._id, role: 'member' },
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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
<<<<<<< HEAD
								members: { _id: user._id, user_name: user.user_name, isAdmin: false },
=======
								members: { user: user?._id, role: 'member' },
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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

<<<<<<< HEAD
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
=======
	async findOne(email, select = "") {
		return await this.userModel.findOne(email).select(select)
	};

	async updateMany(filter, update) {
		return await this.userModel.updateMany(filter, update)
	};
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
}
