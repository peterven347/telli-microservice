import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PostService } from './post.service';
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto, PostDto } from "@app/dtos/auth.dto"


@Controller()
export class PostController {
	constructor(private readonly postService: PostService) { }

	@MessagePattern({ cmd: "get_posts" })
	async handleGetPosts(payload: { cursor?: string }) {
		const { cursor } = payload;
		return this.postService.getPosts(cursor);
	}

	@MessagePattern({ cmd: "create_post" })
	async handlecreatePost(payload: PostDto) {
		return this.postService.createPost(payload)
	}
}
