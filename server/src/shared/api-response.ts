import type { PageMeta } from './pagination';

/** Every JSON response from the API has this shape. */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta_data: PageMeta | null;
  error: string | null;
}
