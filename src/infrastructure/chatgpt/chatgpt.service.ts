import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService }      from '@nestjs/axios';
import { CreateChatRequestDto } from './dtos/create-chat-request.dto';
import { ChatGptResponseDto } from './dtos/chatgpt-response.dto';

@Injectable()
export class ChatGptService {
  constructor(private readonly http: HttpService) {}

  async sendChat(req: CreateChatRequestDto): Promise<ChatGptResponseDto> {
    try {
      const payload = {
        model:       req.model,
        messages: [{ role: 'user', content: req.prompt }],
        temperature: req.temperature,
      };
      const data = this.http.post('/chat/completions', payload)

      return {
        response: 'bateu aq',
        tokensUsed: 20,
        model: 'model 4.2',
      };
    } catch (err) {
      throw new InternalServerErrorException('Falha na comunicação com ChatGPT');
    }
  }
}
