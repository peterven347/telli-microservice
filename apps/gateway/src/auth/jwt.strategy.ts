import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private configService: ConfigService) {
<<<<<<< HEAD
    const secret = configService.get<string>('ACCESS_TOKEN_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
=======
     console.log('JWT STRATEGY INITIALIZED')
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.ACCESS_TOKEN_SECRET,
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
      ignoreExpiration: false,
    });
  }

<<<<<<< HEAD
  async validate(payload: any) {//use types on payload, prevent undefined
    return {
      id: payload.id,
      email: payload.email,
      userName: payload.userName
=======
  async validate(payload: any) {
    return {
      id: payload.id,
      email: payload.email,
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
    };
  }
}