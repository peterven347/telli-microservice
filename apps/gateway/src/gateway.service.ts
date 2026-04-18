import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction } from 'express';

const revoked_access_tokens: string[] = []; //will take up memory over time

@Injectable()
export class AuthService implements NestMiddleware {
	constructor(private jwtService: JwtService) { }
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
}