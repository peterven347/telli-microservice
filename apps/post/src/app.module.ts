import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { ConfigModule } from '@nestjs/config';
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { MongooseModule } from '@nestjs/mongoose';
import { PostModule } from './post.module';

@Module({
  imports: [
<<<<<<< HEAD
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
=======
    MongooseModule.forRoot('mongodb://localhost:27017/telli'),
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
    PostModule,
  ],
})
export class AppModule { }
