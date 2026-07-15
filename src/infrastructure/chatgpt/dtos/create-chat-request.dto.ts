import { IsString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ChatGptModels } from '../constants/chatgpt.constants';

export class CreateChatRequestDto {
  @IsString()
  prompt: string;

  @IsEnum(ChatGptModels)
  @IsOptional()
  model?: ChatGptModels = ChatGptModels.GPT_3_5_TURBO;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number = 0.7;
}
