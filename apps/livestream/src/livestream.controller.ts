import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LivestreamService } from './livestream.service';
import { CreateLivestreamDto } from '../dto/create-livestream.dto';

@Controller()
export class LivestreamController {
  constructor(private readonly livestreamService: LivestreamService) { }

  @MessagePattern({ cmd: 'create_live_stream' })
  async create(userId: string): Promise<any> {
    return this.livestreamService.create(userId);
  }

  @MessagePattern({ cmd: 'stop_live_stream' })
  async stop(userId: string): Promise<any> {
    return this.livestreamService.stop(userId);
  }

  @MessagePattern({ cmd: 'find_all_livestream' })
  async findAll(userId: string): Promise<any> {
    return this.livestreamService.findAll(userId);
  }

  // @MessagePattern('findOneLivestream')
  // findOne(@Payload() id: string): Promise<any> {
  //   return this.livestreamService.findOne(id);
  // }

  @MessagePattern({ cmd: 'get_stream_comments' })
  async getComments(userId: string): Promise<any> {
    return this.livestreamService.getComments(userId);
  }
}
