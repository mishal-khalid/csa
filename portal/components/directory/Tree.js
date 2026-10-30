"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, GripIcon } from "../dashboard/icons";
import { entryIcon, isWithin } from "./entries";

const INDENT = 18;

// The Directory as a folding tree. Picking a row shows its details; the arrow folds and unfolds
// what's inside it. For admins, each row has a handle to drag it by:
// - onto the top or bottom edge of another row, to sit before or after it;
// - onto the middle of a row, to go inside it (a folded row unfolds if held there a moment);
// - onto the space under the tree, to go to the end of the top level.
// Esc cancels a drag. Dropping calls `move(id, parentId, index)`, where index is its place among
// what's already there.
export default function Tree({ childrenOf, byId, selectedId, onSelect, expanded, setExpanded, canEdit, move }) {
  const [drag, setDrag] = useState(null);
  const [moving, setMoving] = useState(null);
  const pointer = useRef({ y: 0 });
  const hold = useRef({ id: null, timer: null });
  const tree = useRef(null);

  const toggle = (id) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // where a drop at (x, y) would put the dragged entry, or null where it can't go
  function targetAt(x, y, draggedId) {
    const element = document.elementFromPoint(x, y);
    if (element?.closest("[data-tree-end]")) return { id: null, zone: "end" };
    const row = element?.closest("[data-entry-row]");
    if (!row || !tree.current?.contains(row)) return null;
    const id = row.dataset.entryRow;
    if (isWithin(id, draggedId, byId)) return null;
    const { top, height } = row.getBoundingClientRect();
    const at = (y - top) / height;
    return { id, zone: at < 0.25 ? "before" : at > 0.75 ? "after" : "inside" };
  }

  // the new parent and index for a drop target
  function placeFor(target, draggedId) {
    const others = (parentId) => (childrenOf.get(parentId) ?? []).filter((e) => e.id !== draggedId);
    if (target.zone === "end") return { parentId: null, index: others(null).length };
    const entry = byId.get(target.id);
    const open = expanded.has(entry.id) && others(entry.id).length > 0;
    if (target.zone === "inside") return { parentId: entry.id, index: others(entry.id).length };
    // just under an unfolded row is the start of what's inside it
    if (target.zone === "after" && open) return { parentId: entry.id, index: 0 };
    const at = others(entry.parentId).findIndex((e) => e.id === entry.id);
    return { parentId: entry.parentId, index: target.zone === "before" ? at : at + 1 };
  }

  // while dragging, hovering a folded row's middle for a moment unfolds it
  function holdOver(target) {
    const id = target?.zone === "inside" ? target.id : null;
    if (hold.current.id === id) return;
    clearTimeout(hold.current.timer);
    hold.current = {
      id,
      timer: id && setTimeout(() => setExpanded((current) => new Set(current).add(id)), 650),
    };
  }

  function startDrag(e, entry) {
    if (e.button !== 0 || moving) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    let active = false;

    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      holdOver(null);
      setDrag(null);
    };
    function onMove(ev) {
      if (!active && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
      active = true;
      pointer.current.y = ev.clientY;
      const target = targetAt(ev.clientX, ev.clientY, entry.id);
      holdOver(target);
      setDrag({ id: entry.id, name: entry.name, x: ev.clientX, y: ev.clientY, target });
    }
    async function onUp(ev) {
      const target = active ? targetAt(ev.clientX, ev.clientY, entry.id) : null;
      finish();
      if (!target) return;
      const { parentId, index } = placeFor(target, entry.id);
      // dropped where it already was
      const current = (childrenOf.get(entry.parentId) ?? []).findIndex((e) => e.id === entry.id);
      if (parentId === entry.parentId && index === current) return;
      setMoving(entry.id);
      if (parentId) setExpanded((current) => new Set(current).add(parentId));
      await move(entry.id, parentId, index);
      setMoving(null);
    }
    const onCancel = () => finish();
    const onKey = (ev) => ev.key === "Escape" && finish();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  }

  // near the top or bottom of the window, a drag scrolls the page
  const dragging = Boolean(drag);
  useEffect(() => {
    if (!dragging) return;
    let frame;
    const step = () => {
      const { y } = pointer.current;
      if (y < 72) window.scrollBy(0, -12);
      else if (y > window.innerHeight - 72) window.scrollBy(0, 12);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  useEffect(() => () => clearTimeout(hold.current.timer), []);

  const target = drag?.target;

  function rows(parentId, depth) {
    return (childrenOf.get(parentId) ?? []).map((entry) => {
      const inside = childrenOf.get(entry.id) ?? [];
      const open = expanded.has(entry.id);
      const selected = entry.id === selectedId;
      const aimed = target?.id === entry.id ? target.zone : null;
      return (
        <li key={entry.id} role="treeitem" aria-selected={selected} aria-expanded={inside.length ? open : undefined}>
          <div
            data-entry-row={entry.id}
            style={{ paddingLeft: 6 + depth * INDENT }}
            className={`group relative flex items-center gap-0.5 rounded-xl py-1 pr-1 transition-colors duration-150 ${
              selected ? "bg-ink text-white" : aimed === "inside" ? "bg-ink/[0.06] ring-2 ring-ink/25" : "hover:bg-ink/[0.04]"
            } ${drag?.id === entry.id || moving === entry.id ? "opacity-40" : ""}`}
          >
            {inside.length ? (
              <button
                type="button"
                onClick={() => toggle(entry.id)}
                aria-label={open ? `Fold ${entry.name}` : `Unfold ${entry.name}`}
                className={`grid size-6 shrink-0 place-items-center rounded-md ${selected ? "text-white/70 hover:text-white" : "text-ink/40 hover:text-ink"}`}
              >
                <ChevronRightIcon className={`size-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
              </button>
            ) : (
              <span className="size-6 shrink-0" />
            )}
            <button type="button" onClick={() => onSelect(entry.id)} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-[14px]">
              {entryIcon(entry, `size-[18px] shrink-0 ${selected ? "text-white/80" : "text-ink/55"}`)}
              <span className="truncate">{entry.name}</span>
            </button>
            {canEdit && (
              <span
                onPointerDown={(e) => startDrag(e, entry)}
                aria-hidden="true"
                className={`grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
                  selected ? "text-white/60" : "text-ink/35"
                }`}
              >
                <GripIcon className="size-4" />
              </span>
            )}
            {(aimed === "before" || aimed === "after") && (
              <span
                className={`pointer-events-none absolute right-2 h-0.5 rounded-full bg-ink ${aimed === "before" ? "-top-px" : "-bottom-px"}`}
                style={{ left: 6 + (aimed === "after" && open && inside.length ? depth + 1 : depth) * INDENT + 24 }}
              />
            )}
          </div>
          {open && inside.length > 0 && (
            <ul role="group" className="mt-0.5 space-y-0.5">
              {rows(entry.id, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  }

  return (
    <div ref={tree}>
      <ul role="tree" aria-label="Directory" className="space-y-0.5">
        {rows(null, 0)}
      </ul>
      {/* the space under the tree: dropping here puts an entry at the end of the top level */}
      {canEdit && (
        <div data-tree-end className="relative mt-1 h-8">
          {target?.zone === "end" && <span className="pointer-events-none absolute left-2 right-2 top-1 h-0.5 rounded-full bg-ink" />}
        </div>
      )}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 max-w-60 truncate rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(11,11,12,0.25)]"
          style={{ left: drag.x + 14, top: drag.y + 12 }}
        >
          {drag.name}
        </div>
      )}
    </div>
  );
}
