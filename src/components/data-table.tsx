import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  align?: "left" | "right";
  className?: string;
  /** Leave the column out of the stacked phone layout (it is usually folded into `mobileTitle`). */
  hideOnMobile?: boolean;
};

/**
 * A table on desktops, a stack of cards on phones and tablets (the sidebar leaves a tablet too narrow for every column). The header sticks to the top of the
 * page while its rows scroll, so the table must not sit inside a scrolling wrapper.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  mobileTitle,
  empty,
  caption,
  rowClassName,
  footer,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** The first line of each phone card. */
  mobileTitle: (row: Row) => ReactNode;
  empty: ReactNode;
  caption: string;
  rowClassName?: (row: Row) => string | undefined;
  footer?: ReactNode;
}) {
  if (rows.length === 0) return <div className="rounded-xl border bg-card shadow-raised">{empty}</div>;

  return (
    <>
      <div className="hidden rounded-xl border bg-card shadow-raised lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "h-9 border-b bg-card px-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground",
                    index === 0 && "rounded-tl-xl",
                    index === columns.length - 1 && "rounded-tr-xl",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn("group/row border-b transition-colors last:border-0 hover:bg-muted/50 focus-within:bg-muted/50", rowClassName?.(row))}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 py-2.5 align-middle", column.align === "right" && "text-right", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {footer ? <div className="border-t px-3 py-2.5">{footer}</div> : null}
      </div>

      <div className="lg:hidden">
        <ul className="space-y-2" aria-label={caption}>
          {rows.map((row) => (
            <li key={rowKey(row)} className={cn("rounded-xl border bg-card p-3 shadow-raised", rowClassName?.(row))}>
              <div className="text-sm font-medium">{mobileTitle(row)}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                {columns
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground">{column.header}</dt>
                      <dd>{column.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </li>
          ))}
        </ul>
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </>
  );
}
