import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction } from 'express';
import { SignOptions } from 'jsonwebtoken';
import { Redis } from 'ioredis';

const revoked_access_tokens: string[] = []; //will take up memory over time

function verifyToken(jwtService: JwtService, payload: any, options?: SignOptions): any {
	return jwtService.verify(payload, options);
};

function generateToken(jwtService: JwtService, payload: any, options?: SignOptions): string {
	return jwtService.sign(payload, options);
};

@Injectable()
export class AuthService implements NestMiddleware {
	constructor(
		private jwtService: JwtService,
		@Inject("REDIS_CLIENT") private readonly redis: Redis,

	) { }
	sign(user: any) {
		return this.jwtService.sign({
			sub: user._id,
			email: user.email,
		});
	}

	verify(token: string) {
		return this.jwtService.verify(token);
	}

	async use(req: any, res: any, next: NextFunction) {
		try {
			const authHeader = req.get("Authorization")
			if (!authHeader) {
				return res.json({ message: "no auth" })
			}

			const token = authHeader.split(" ")[1]
			const revoked = authHeader.split(" ")[2] === "exp"
			if (revoked_access_tokens.includes(token)) {
				req.auth = { exp: "revoked" }
				return req.auth
			}

			const tokenn = this.verify(token)
			console.log("tokenn", tokenn)
			next()
		} catch (err) {
			req.auth = { message: "Authentication error!" }
		}
	}

	async refreshAccessToken(body: any) {
		try {
			const decoded = verifyToken(this.jwtService, body.refreshToken)
			const accessToken = generateToken(this.jwtService,
				{ email: decoded.email, user_name: decoded.user_name },
				{ expiresIn: "50m" }
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
}