import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';


@Injectable()
export class CallService {
    private client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.TCP,
            options: {
                host: '127.0.0.1',
                port: 3001,
            },
        });
    }

    async getHello(): Promise<string> {
        const pattern = { cmd: 'hello' };
        const payload = { id: 98 };

        return await firstValueFrom(this.client.send<string>(pattern, payload));
    }
}
