import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type Props<T> = {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => string | number;
  className?: string;
  maxHeight?: number;
  gap?: number;
  overscan?: number;
};

export function VirtualRows<T>({
  items,
  estimateSize,
  renderItem,
  getKey,
  className,
  maxHeight = 600,
  gap = 12,
  overscan = 6,
}: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
    getItemKey: (i) => (getKey ? getKey(items[i], i) : i),
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto rounded-md ${className ?? ""}`}
      style={{ maxHeight, contain: "strict" }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((v) => {
          const item = items[v.index];
          return (
            <div
              key={v.key}
              data-index={v.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${v.start}px)`,
                paddingBottom: gap,
              }}
            >
              {renderItem(item, v.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-2">
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-accent"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          Anterior
        </button>
        <span className="px-2">
          {page + 1} / {pages}
        </span>
        <button
          type="button"
          className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-accent"
          onClick={() => onPageChange(Math.min(pages - 1, page + 1))}
          disabled={page >= pages - 1}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
