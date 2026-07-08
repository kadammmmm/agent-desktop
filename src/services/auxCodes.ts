/**
 * Paginated aux-code fetcher.
 *
 * Wraps Desktop.agentConfigJsApi.fetchPaginatedAuxCodes({ workType, page, pageSize, search })
 * with graceful fallback to the legacy actions.getIdleCodes / getWrapUpCodes when
 * the paginated module is unavailable (older SDKs / demo mode).
 */

export type AuxWorkType = 'IDLE_CODE' | 'WRAP_UP_CODE';

export interface AuxCode {
  id: string;
  name: string;
}

export interface AuxPage {
  codes: AuxCode[];
  page: number;
  totalPages: number;
  totalRecords: number;
  hasMore: boolean;
}

interface FetchParams {
  workType: AuxWorkType;
  page?: number;
  pageSize?: number;
  search?: string;
}

function getDesktop(): any {
  return (typeof window !== 'undefined' && (window as any).Desktop) || null;
}

const emptyPage = (page = 0): AuxPage => ({
  codes: [],
  page,
  totalPages: 0,
  totalRecords: 0,
  hasMore: false,
});

export async function fetchAuxCodes({
  workType,
  page = 0,
  pageSize = 50,
  search,
}: FetchParams): Promise<AuxPage> {
  const Desktop = getDesktop();

  // Preferred: paginated API
  const agentConfig = Desktop?.agentConfigJsApi ?? Desktop?.agentConfig;
  if (agentConfig?.fetchPaginatedAuxCodes) {
    try {
      const resp: any = await agentConfig.fetchPaginatedAuxCodes({
        workType,
        page,
        pageSize,
        search: search?.trim() || undefined,
      });
      const rows: any[] = Array.isArray(resp?.data) ? resp.data : [];
      const meta = resp?.meta ?? {};
      const currentPage: number = typeof meta.page === 'number' ? meta.page : page;
      const totalPages: number = typeof meta.totalPages === 'number' ? meta.totalPages : rows.length ? 1 : 0;
      const totalRecords: number = typeof meta.totalRecords === 'number' ? meta.totalRecords : rows.length;
      return {
        codes: rows.map((r) => ({ id: r.id, name: r.name })),
        page: currentPage,
        totalPages,
        totalRecords,
        hasMore: currentPage + 1 < totalPages,
      };
    } catch (err) {
      console.warn('[auxCodes] fetchPaginatedAuxCodes failed, falling back:', err);
    }
  }

  // Fallback: legacy full-list actions
  try {
    const legacy =
      workType === 'IDLE_CODE'
        ? await Desktop?.actions?.getIdleCodes?.()
        : await Desktop?.actions?.getWrapUpCodes?.();
    if (Array.isArray(legacy)) {
      const q = search?.trim().toLowerCase();
      const filtered = q
        ? legacy.filter((c: any) => (c.name ?? '').toLowerCase().includes(q))
        : legacy;
      return {
        codes: filtered.map((c: any) => ({ id: c.id, name: c.name })),
        page: 0,
        totalPages: 1,
        totalRecords: filtered.length,
        hasMore: false,
      };
    }
  } catch (err) {
    console.warn('[auxCodes] legacy fallback failed:', err);
  }

  return emptyPage(page);
}
