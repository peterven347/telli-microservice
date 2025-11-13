import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { SignOptions } from 'jsonwebtoken';

const revoked_access_tokens: string[] = [] //will take up memory over time

function verifyToken(jwtService: JwtService, payload: any, options?: SignOptions): any {
	return jwtService.sign(payload, options);
}

@Injectable()
export class AuthService implements NestMiddleware {
	constructor(private jwtService: JwtService) { }
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

			const tokenn = verifyToken(this.jwtService, token)
			console.log("tokenn", tokenn)
			// next()
			// jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user: any) => {
			// 	// console.log(req.method, req.path)
			// 	if (err) {
			// 		if (err.name === "TokenExpiredError") {
			// 			req.auth = { exp: true }
			// 			return res.json(req.auth)
			// 		}
			// 		req.auth = { exp: "invalid token" }
			// 		console.log(1111)
			// 		return res.json(req.auth)
			// 	} else if (revoked) {
			// 		console.log(1)
			// 		revoked_access_tokens.push(token)
			// 		req.auth = { exp: true }
			// 		return res.json(req.auth)
			// 	} else {
			// 		req.auth = { email: user?.email }
			// 		next()
			// 	}
			// })
			req.auth = { email: "petervenwest1@gmail.com" }
			next()
		} catch (err) {
			req.auth = { message: "Authentication error!" }
		}
	}
}
