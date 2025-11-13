import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

export function socketAuthMiddleware(server: Server): void {
	server.use((socket: Socket, next) => {
		console.log('init socket');
		try {
			const token = socket.handshake.auth?.token;
			if (!token) {
				console.log('No token');
				return next(new Error('no auth token'));
			}
			jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err, decoded) => {
				if (err) {
					console.log('socket auth err');
					return next(new Error('invalid token'));
				}
				if (typeof decoded === 'object' && decoded !== null) {
					socket.data.userEmail = (decoded as { email: string }).email;
					// socket.data.userEmail = (decoded as { email: string }).email;
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
