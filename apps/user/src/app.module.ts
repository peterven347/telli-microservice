import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
<<<<<<< HEAD
import { ConfigModule, ConfigService } from '@nestjs/config';
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { UserModule } from './user.module';

@Module({
  imports: [
<<<<<<< HEAD
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    UserModule,
  ],
})
export class AppModule { }
=======
    MongooseModule.forRoot('mongodb://localhost:27017/telli'),
    UserModule,
  ],
})
export class AppModule {}
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
