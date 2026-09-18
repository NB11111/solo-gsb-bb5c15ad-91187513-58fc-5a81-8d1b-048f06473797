import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RedactionMap } from '../types';
import { includedCount, isExcluded, type PageOrderState } from '../pdf/pageOrder';

const THUMB_WIDTH = 132;

interface Props {
  pdf: PDFDocumentProxy;
  current: number;
  redactions: RedactionMap;
  /** 导出页序编排（原始页号的排列 + 排除集合） */
  arrangement: PageOrderState;
  onSelect(pageNum: number): void;
  onMove(pageNum: number, delta: -1 | 1): void;
  onToggleExcluded(pageNum: number): void;
  onResetOrder(): void;
}

/**
 * 导出页序面板：缩略图按当前编排顺序排列。
 * 页号一律为原始页号（稳定标识）——重排只改变列表顺序与导出顺序，
 * 点击跳转、遮盖计数、编辑目标仍指向原始页。
 */
export function PageList({
  pdf,
  current,
  redactions,
  arrangement,
  onSelect,
  onMove,
  onToggleExcluded,
  onResetOrder,
}: Props) {
  const total = arrangement.order.length;
  const included = includedCount(arrangement);
  const dirty = arrangement.excluded.length > 0 ||
    arrangement.order.some((p, i) => p !== i + 1);

  return (
    <aside className="page-list">
      <div className="order-head">
        <span className="order-title">导出页序</span>
        <span className="order-meta">
          导出 {included} / {total} 页
        </span>
        <button
          type="button"
          className="order-reset"
          disabled={!dirty}
          onClick={onResetOrder}
          title="恢复原始页序并取消全部排除"
        >
          重置
        </button>
      </div>
      {arrangement.order.map((n, index) => (
        <Thumb
          key={n}
          pdf={pdf}
          pageNum={n}
          active={n === current}
          count={redactions[n]?.length ?? 0}
          excluded={isExcluded(arrangement, n)}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          canExclude={included > 1}
          onClick={() => onSelect(n)}
          onMove={(delta) => onMove(n, delta)}
          onToggleExcluded={() => onToggleExcluded(n)}
        />
      ))}
    </aside>
  );
}

interface ThumbProps {
  pdf: PDFDocumentProxy;
  pageNum: number;
  active: boolean;
  count: number;
  excluded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** 为 false 表示这是最后一个未排除页，不允许再排除 */
  canExclude: boolean;
  onClick(): void;
  onMove(delta: -1 | 1): void;
  onToggleExcluded(): void;
}

function Thumb({
  pdf,
  pageNum,
  active,
  count,
  excluded,
  canMoveUp,
  canMoveDown,
  canExclude,
  onClick,
  onMove,
  onToggleExcluded,
}: ThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { cancel(): void } | undefined;
    (async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const renderTask = page.render({ canvasContext: ctx, viewport });
      task = renderTask;
      await renderTask.promise.catch(() => {
        /* 取消时忽略 */
      });
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNum]);

  return (
    <div className={`thumb${active ? ' active' : ''}${excluded ? ' excluded' : ''}`}>
      <button type="button" className="thumb-main" onClick={onClick} title={`跳转到第 ${pageNum} 页`}>
        <canvas ref={canvasRef} />
        <div className="thumb-meta">
          <span>第 {pageNum} 页</span>
          {count > 0 && <span className="badge">{count} 处遮盖</span>}
          {excluded && <span className="badge excluded-badge">已排除</span>}
        </div>
      </button>
      <div className="thumb-tools">
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={() => onMove(-1)}
          title="在导出页序中上移"
          aria-label={`第 ${pageNum} 页上移`}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={() => onMove(1)}
          title="在导出页序中下移"
          aria-label={`第 ${pageNum} 页下移`}
        >
          ↓
        </button>
        <button
          type="button"
          className={excluded ? 'restore' : ''}
          disabled={!excluded && !canExclude}
          onClick={onToggleExcluded}
          title={
            excluded
              ? '恢复：重新纳入导出的 PDF'
              : canExclude
                ? '排除：导出的 PDF 不包含此页（遮盖保留，可随时恢复）'
                : '不允许排除全部页面'
          }
        >
          {excluded ? '恢复' : '排除'}
        </button>
      </div>
    </div>
  );
}
