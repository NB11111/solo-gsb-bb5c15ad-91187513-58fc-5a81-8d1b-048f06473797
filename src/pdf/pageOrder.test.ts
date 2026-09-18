import { describe, expect, it } from 'vitest';
import {
  includedCount,
  includedPages,
  initPageOrder,
  isExcluded,
  movePage,
  setPageExcluded,
  type PageOrderState,
} from './pageOrder';

describe('initPageOrder', () => {
  it('生成原始页序且无排除页', () => {
    expect(initPageOrder(4)).toEqual({ order: [1, 2, 3, 4], excluded: [] });
    expect(initPageOrder(1)).toEqual({ order: [1], excluded: [] });
    expect(initPageOrder(0)).toEqual({ order: [], excluded: [] });
  });
});

describe('movePage', () => {
  it('上移 / 下移与相邻页交换，页号身份不变', () => {
    const s = initPageOrder(4);
    expect(movePage(s, 3, -1).order).toEqual([1, 3, 2, 4]);
    expect(movePage(s, 2, 1).order).toEqual([1, 3, 2, 4]);
  });

  it('连续移动可把页面移到任意位置', () => {
    let s = initPageOrder(5);
    s = movePage(s, 5, -1);
    s = movePage(s, 5, -1);
    s = movePage(s, 5, -1);
    s = movePage(s, 5, -1);
    expect(s.order).toEqual([5, 1, 2, 3, 4]);
  });

  it('边界处移动返回原状态（同一引用）', () => {
    const s = initPageOrder(3);
    expect(movePage(s, 1, -1)).toBe(s);
    expect(movePage(s, 3, 1)).toBe(s);
  });

  it('未知页号返回原状态', () => {
    const s = initPageOrder(3);
    expect(movePage(s, 9, 1)).toBe(s);
    expect(movePage(s, 0, -1)).toBe(s);
  });

  it('移动不影响排除状态', () => {
    let s = initPageOrder(3);
    s = setPageExcluded(s, 2, true)!;
    const moved = movePage(s, 2, -1);
    expect(moved.order).toEqual([2, 1, 3]);
    expect(moved.excluded).toEqual([2]);
  });
});

describe('setPageExcluded', () => {
  it('排除后从导出序列消失，恢复后回到编排中的原位置', () => {
    let s = initPageOrder(4);
    s = movePage(s, 4, -1); // [1, 2, 4, 3]
    s = setPageExcluded(s, 4, true)!;
    expect(includedPages(s)).toEqual([1, 2, 3]);
    s = setPageExcluded(s, 4, false)!;
    expect(includedPages(s)).toEqual([1, 2, 4, 3]);
  });

  it('重复排除 / 恢复返回原状态', () => {
    const s = initPageOrder(3);
    expect(setPageExcluded(s, 2, false)).toBe(s);
    const ex = setPageExcluded(s, 2, true)!;
    expect(setPageExcluded(ex, 2, true)).toBe(ex);
  });

  it('不允许排除全部页面：排除最后一页时返回 null', () => {
    let s = initPageOrder(2);
    s = setPageExcluded(s, 1, true)!;
    expect(includedCount(s)).toBe(1);
    expect(setPageExcluded(s, 2, true)).toBeNull();

    const single = initPageOrder(1);
    expect(setPageExcluded(single, 1, true)).toBeNull();
  });

  it('排除未知页号返回原状态', () => {
    const s = initPageOrder(3);
    expect(setPageExcluded(s, 9, true)).toBe(s);
  });
});

describe('includedPages / includedCount', () => {
  it('导出序列按编排顺序列出未排除的原始页号', () => {
    let s: PageOrderState = initPageOrder(5);
    s = movePage(s, 3, -1); // [1, 3, 2, 4, 5]
    s = setPageExcluded(s, 2, true)!;
    s = setPageExcluded(s, 5, true)!;
    expect(includedPages(s)).toEqual([1, 3, 4]);
    expect(includedCount(s)).toBe(3);
    expect(isExcluded(s, 2)).toBe(true);
    expect(isExcluded(s, 3)).toBe(false);
  });

  it('全部未排除时即编排顺序本身', () => {
    const s = initPageOrder(3);
    expect(includedPages(s)).toEqual([1, 2, 3]);
    expect(includedCount(s)).toBe(3);
  });
});
