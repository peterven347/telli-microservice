import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PostService } from './post.service';
<<<<<<< HEAD
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto, PostDto } from "@app/dtos/dto"
=======
import { EmailDto, LoginDto, PhoneNumbersDto, SignUpDto, PostDto } from "@app/dtos/auth.dto"
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348


@Controller()
export class PostController {
	constructor(private readonly postService: PostService) { }

	@MessagePattern({ cmd: "get_posts" })
<<<<<<< HEAD
	async handleGetPosts(payload: { cursor?: string, userId: string }) {
		const { cursor = "", userId } = payload;
		return this.postService.getPosts(userId, cursor );
	}

	@MessagePattern({ cmd: "get_user_posts" })
	async handleGetUserPosts(payload: { userId: string, cursor?: string }) {
		const { userId, cursor = "" } = payload;
		return this.postService.getUserPosts(userId, cursor);
	}

	@MessagePattern({ cmd: "get_comments" })
	async handleGetComments(payload: { postId: string, cursor?: string }) {
		const { postId, cursor = "" } = payload;
		return this.postService.getcomments(postId, cursor);
	}

	@MessagePattern({ cmd: "create_post" })
	async handlecreatePost(payload: any) {
		return this.postService.createPost(payload)
	}

	@MessagePattern({ cmd: "like_post" })
	async handleLikePost(payload: any) {
		return this.postService.likePost(payload)
	}

	@MessagePattern({ cmd: "like_comment" })
	async handleLikeComment(payload: any) {
		return this.postService.likeComment(payload)
	}

	@MessagePattern({ cmd: "create_comment" })
	async handleCreateComment(payload: any) {
		return this.postService.createComment(payload)
	}

	@MessagePattern({ cmd: "delete_post" })
	async handleDeletePost(payload: any) {
		return this.postService.deletePost(payload)
	}
=======
	async handleGetPosts(payload: { cursor?: string }) {
		const { cursor } = payload;
		return this.postService.getPosts(cursor);
	}

	@MessagePattern({ cmd: "create_post" })
	async handlecreatePost(payload: PostDto) {
		return this.postService.createPost(payload)
	}
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
}
