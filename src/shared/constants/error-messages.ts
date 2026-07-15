import { ErrorCode } from '../enums/error-code.enum';

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_PROMPT]: 'O prompt enviado é inválido.',
  [ErrorCode.OPENAI_ERROR]: 'Erro ao comunicar com o modelo de IA.',
  [ErrorCode.USER_NOT_FOUND]: 'Usuário não encontrado.',
  [ErrorCode.RATE_LIMIT]: 'Você atingiu o limite de uso.',
  [ErrorCode.INTERNAL_ERROR]: 'Erro interno inesperado.',
};
