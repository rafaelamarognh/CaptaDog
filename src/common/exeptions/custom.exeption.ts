import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomException extends HttpException {
  constructor(
    public readonly code: string,
    public readonly message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errors?: any,
  ) {
    super({ message, errors, code }, status);
  }
}