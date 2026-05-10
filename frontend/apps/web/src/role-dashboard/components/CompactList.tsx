import type { CompactItem } from "../types";

export function CompactList({ items, emptyText }: { items: CompactItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="role-empty">{emptyText}</p>;
  }
  return (
    <div className="compact-list">
      {items.map((item) => (
        <div className="compact-row" key={item.id}>
          <strong>{item.title}</strong>
          <span>{item.meta}</span>
        </div>
      ))}
    </div>
  );
}
