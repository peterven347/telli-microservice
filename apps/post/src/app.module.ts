import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostModule } from './post.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/telli'),
    PostModule,
  ],
})
export class AppModule { }
