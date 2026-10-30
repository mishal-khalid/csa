import { createElement } from "react";
import { BodyIcon, CommissionIcon, CompanyIcon, DepartmentIcon, FolderIcon, InstitutionIcon, KindIcon } from "../dashboard/icons";

// The Directory's kinds and its tree, worked out from the flat list of entries the API gives.

export const builtInKinds = ["Department", "Body", "Commission", "Company", "Institution"];

const kindIcons = { Department: DepartmentIcon, Body: BodyIcon, Commission: CommissionIcon, Company: CompanyIcon, Institution: InstitutionIcon };

const iconFor = (entry) => (entry.folder ? FolderIcon : (kindIcons[entry.kind] ?? KindIcon));

// an entry's icon: a folder, its kind's, or a plain one for kinds added later
export const entryIcon = (entry, className) => createElement(iconFor(entry), { className });

export const kindOf = (entry) => (entry.folder ? "Folder" : entry.kind);

// the five built-in kinds, then any others in use, A to Z
export function kindsIn(entries) {
  const added = new Set(entries.filter((e) => !e.folder && !builtInKinds.includes(e.kind)).map((e) => e.kind));
  return [...builtInKinds, ...[...added].sort((a, b) => a.localeCompare(b))];
}

// what's inside each entry (and, under null, the top level), in order
export function childrenMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!map.has(entry.parentId)) map.set(entry.parentId, []);
    map.get(entry.parentId).push(entry);
  }
  for (const list of map.values()) list.sort((a, b) => a.position - b.position);
  return map;
}

// the entries an entry is inside, from the top down
export function pathTo(id, byId) {
  const path = [];
  for (let at = byId.get(id)?.parentId; at; at = byId.get(at)?.parentId) path.unshift(byId.get(at));
  return path;
}

// whether `id` is `ancestorId` or anywhere inside it
export function isWithin(id, ancestorId, byId) {
  for (let at = id; at; at = byId.get(at)?.parentId) if (at === ancestorId) return true;
  return false;
}
