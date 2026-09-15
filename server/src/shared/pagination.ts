import { PaginationQueryDto } from './pagination.dto';

export interface PageMeta {
  page: number;
  page_size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}


export class PaginatedResult<T> {
  constructor(
    readonly items: T[],
    readonly meta: PageMeta,
  ) { }
}


export async function paginate<T>(
  query: PaginationQueryDto,
  fetchRows: (args: { skip: number; take: number }) => Promise<T[]>,
): Promise<PaginatedResult<T>> {
  const { page, page_size } = query;
  const rows = await fetchRows({
    skip: (page - 1) * page_size,
    take: page_size + 1,
  });
  return new PaginatedResult(rows.slice(0, page_size), {
    page,
    page_size,
    hasNext: rows.length > page_size,
    hasPrevious: page > 1,
  });
}
