// Pagination optionnelle : si aucun paramètre `page` n'est fourni, l'appelant
// obtient le comportement historique (tableau complet), pour ne pas casser les
// écrans qui ont besoin de tout l'historique (tableau de bord, etc.). Dès que
// `page` est présent, la route bascule sur une réponse paginée.
export type PaginationParams = { page: number; pageSize: number; skip: number; take: number };

export function parsePagination(searchParams: URLSearchParams, defaultPageSize = 20): PaginationParams | null {
  const pageParam = searchParams.get("page");
  if (!pageParam) return null;
  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || defaultPageSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginatedResponse<T>(items: T[], total: number, pagination: PaginationParams) {
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}
