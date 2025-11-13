import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
	constructor(private jwtService: JwtService) { }

	async hashPassword(password: string): Promise<string> {
		return bcrypt.hash(password, 10);
	}

	async validatePassword(raw: string, hashed: string): Promise<boolean> {
		return bcrypt.compare(raw, hashed);
	}

	async generateToken(payload: any): Promise<string> {
		return this.jwtService.sign(payload);
	}

	async login(dto: { email: string; password: string }) {
		// simulate DB user
		const user = { id: '1', email: dto.email, password: await this.hashPassword('password') };

		const isMatch = await this.validatePassword(dto.password, user.password);
		if (!isMatch) throw new UnauthorizedException();

		return {
			access_token: await this.generateToken({ sub: user.id, email: user.email }),
		};
	}
}
