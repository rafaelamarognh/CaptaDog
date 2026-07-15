export class AppErrorDto {
  success: false;
  data: null;
  message: string;
  meta: {
    timestamp: string;
    path: string;
    method: string;
  };
  errors?: any;
}
