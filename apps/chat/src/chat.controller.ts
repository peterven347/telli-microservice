import { Controller, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @MessagePattern({ cmd: "test" })
    async test() {
        return this.chatService.test()
    }

    @MessagePattern({ cmd: "get_domain" })
    async handleGetDomain() {
        return this.chatService.getDomain()
    }

    @MessagePattern({ cmd: "get_domain_by_sector" })
    async handleGetDomainBySector(sectorId: string) {
        return this.chatService.getDomainBySector(sectorId)
    }

    @MessagePattern({ cmd: "find_sector_to_join" })
    async handleFindSector(sectorTitle: string) {
        return this.chatService.findSector(sectorTitle)
    }

    @MessagePattern({ cmd: "get_missed_messages" })
    async handleMissedMessages(sectorId: string, skip: number) {
        return this.chatService.getMissedMessages(sectorId, skip)
    };

    @MessagePattern({ cmd: "create_domain" })
    async handleCreateDomain(payload: any) {
        return this.chatService.createDomain(payload)
    }

    @MessagePattern({ cmd: "create_sector" })
    async handleCreateSector(domainId: string, payload: any) {
        return this.chatService.createSector(domainId, payload)
    }

    @MessagePattern({ cmd: "change_domain_holder" })
    async handleChangeDomainHolder(domainId: string, q: string, body: any) {
        return this.chatService.changeDomainHolder(domainId, q, body)
    }

    @MessagePattern({ cmd: "change_sector_name" })
    async handleChangeSectorName(sectorId: string, domainId: string, body: any) {
        return this.chatService.changeSectorName(sectorId, domainId, body)
    }
}