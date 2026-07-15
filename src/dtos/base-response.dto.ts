export class BaseResponseDto<T> {
  success: boolean;
  data: T;
  message?: string;
}
