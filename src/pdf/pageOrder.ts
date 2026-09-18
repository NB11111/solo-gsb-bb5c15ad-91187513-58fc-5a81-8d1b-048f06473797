/**
 * 导出页序编排（纯函数，不依赖 DOM / pdf.js）：
 *
 * 页面与遮盖始终以「原始页号」（PDF 中的页码，从 1 开始）作为稳定标识；
 * 本模块只维护一个编排状态：原始页号的排列顺序 + 被排除的原始页号集合。
 * 重排 / 排除只影响「导出安全 PDF」时处理哪些页、按什么顺序处理，
 * 不改变任何遮盖数据（遮盖仍按原始页号存取），也不进入撤销历史。
 *
 * 约束：不允许排除全部页面——至少保留一页可导出。
 */

export interface PageOrderState {
  /** 导出编排顺序：原始页号的排列，长度恒等于文档页数（每个页号恰好出现一次） */
  order: number[];
  /** 被排除的原始页号（不重复，顺序无关） */
  excluded: number[];
}

/** 初始编排：按原始页序 1..numPages，无排除页 */
export function initPageOrder(numPages: number): PageOrderState {
  return {
    order: Array.from({ length: Math.max(0, numPages) }, (_, i) => i + 1),
    excluded: [],
  };
}

export function isExcluded(state: PageOrderState, page: number): boolean {
  return state.excluded.includes(page);
}

/** 未排除页的数量（导出进度总数） */
export function includedCount(state: PageOrderState): number {
  return state.order.length - state.excluded.length;
}

/** 按当前编排顺序列出未排除的原始页号——即导出时实际处理的页序列 */
export function includedPages(state: PageOrderState): number[] {
  return state.order.filter((p) => !state.excluded.includes(p));
}

/**
 * 在编排顺序中把某页上移（delta = -1）/ 下移（delta = +1）一位。
 * 页号不在编排中、或已在边界时返回原状态（不产出新对象）。
 * 排除状态不随位置变化。
 */
export function movePage(
  state: PageOrderState,
  page: number,
  delta: -1 | 1,
): PageOrderState {
  const from = state.order.indexOf(page);
  if (from < 0) return state;
  const to = from + delta;
  if (to < 0 || to >= state.order.length) return state;
  const order = [...state.order];
  order[from] = order[to];
  order[to] = page;
  return { ...state, order };
}

/**
 * 排除 / 恢复某页（页号本身留在编排顺序中，恢复后仍在原位置）。
 * 若排除后将没有任何可导出页，返回 null 表示拒绝（调用方保持原状）。
 */
export function setPageExcluded(
  state: PageOrderState,
  page: number,
  excluded: boolean,
): PageOrderState | null {
  const has = state.excluded.includes(page);
  if (excluded === has) return state;
  if (excluded) {
    if (!state.order.includes(page)) return state;
    if (includedCount(state) <= 1) return null; // 不允许排除全部页面
    return { ...state, excluded: [...state.excluded, page] };
  }
  return { ...state, excluded: state.excluded.filter((p) => p !== page) };
}
