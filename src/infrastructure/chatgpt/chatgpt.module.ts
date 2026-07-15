import { Module }            from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule }        from '@nestjs/axios';
import chatgptConfig         from './config/chatgpt.config';
import { ChatGptService }    from './chatgpt.service';

@Module({
  imports: [
    ConfigModule.forFeature(chatgptConfig),
    HttpModule.registerAsync({
      imports:    [ConfigModule.forFeature(chatgptConfig)],
      inject:     [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get('chatgpt') as ReturnType<typeof chatgptConfig>;
        return {
          baseURL: config.baseUrl,
          timeout: config.timeoutMs,
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type':  'application/json',
          },
          // retries, interceptors, etc. podem ser configurados aqui
        };
      },
    }),
  ],
  providers: [ChatGptService],
  exports:   [ChatGptService],
})
export class ChatGptModule {}
