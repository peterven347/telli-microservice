import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @MessagePattern({ cmd: "get_domain" })
    async handleGetDomain(userId: string) {
        return this.chatService.getDomain(userId)
    }

    @MessagePattern({ cmd: "get_sector_domain" })
    async handleGetSectorDomain(domainId: string, userId: string) {
        return this.chatService.getSectorDomain(domainId, userId)
    }

    @MessagePattern({ cmd: "find_sector_to_join" })
    async handleFindSector(sectorTitle: string, userId: string) {
        return this.chatService.findSectors(sectorTitle, userId)
    }

    @MessagePattern({ cmd: "create_domain" })
    async handleCreateDomain(payload: any) {
        return this.chatService.createDomain(payload)
    }

    @MessagePattern({cmd: "exit_sector"})
    async handleExitSector(payload){
        return this.chatService.exitSector(payload)
    }

    @MessagePattern({cmd: "exit_domain"})
    async handleExitDomain(payload){
        return this.chatService.exitDomain(payload)
    }

    @MessagePattern({ cmd: "create_sector" })
    async handleCreateSector(payload: any) {
        return this.chatService.createSector(payload)
    }

    @MessagePattern({ cmd: "edit_domain_img" })
    async handleEditDomainImg(domainId: string, q: string, body: any) {
        return this.chatService.editDomainImg(domainId, q, body)
    }

    @MessagePattern({ cmd: "change_sector_name" })
    async handleChangeSectorName(sectorId: string, domainId: string, body: any) {
        return this.chatService.changeSectorName(sectorId, domainId, body)
    }

    //
    @Get('domain/:id')
    async findByIdDomain(
        @Param('id') id: string,
        @Query() query: any,
    ) {
        return this.chatService.findByIdDomain(id, query);
    }

    @Get('sector/:id')
    async findByIdSector(
        @Param('id') id: string,
        @Query() query: any,
    ) {
        return this.chatService.findByIdSector(id, query);
    }

    @Get(':id/exists')
    async exists(@Param('id') id: string) {
        return this.chatService.exists({ _id: id });
    }

    @Patch('update-one')
    async updateOneSector(
        @Body() body: { filter: any; update: any },
    ) {
        const { filter, update } = body;
        return this.chatService.updateOneSector(filter, update);
    }
    //

}