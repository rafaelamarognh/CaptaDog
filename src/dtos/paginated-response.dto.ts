export class PaginatedResponseDto<T> {
  data: T[];
  page: number;
  size: number;
  total: number;
}