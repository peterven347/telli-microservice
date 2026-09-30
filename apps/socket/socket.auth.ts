import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

<<<<<<< HEAD
export function socketAuth(server: Server): void {
	server.use((socket: Socket, next) => {
=======
export function socketAuthMiddleware(server: Server): void {
	server.use((socket: Socket, next) => {
		console.log('init socket');
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
		try {
			const token = socket.handshake.auth?.token;
			if (!token) {
				console.log('No token');
				return next(new Error('no auth token'));
			}
			jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err, decoded) => {
				if (err) {
					console.log('socket auth err');
<<<<<<< HEAD
					return next(new Error('invalid or expired token'));
=======
					return next(new Error('invalid token'));
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
				}
				if (typeof decoded === 'object' && decoded !== null) {
					socket.data.userEmail = (decoded as { email: string }).email;
					next();
				} else {
					return next(new Error('invalid token payload'));
				}
			});
		} catch (err) {
			console.log('Socket auth middleware error:');
			next(new Error('internal error'));
		}
	});
}
