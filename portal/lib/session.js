"use client";

import { createContext, useContext } from "react";

// The signed-in account, as the API describes it ({ id, number, name, username, email, role, main }).
// The dashboard shell fetches it once and shares it with every tab.
export const SessionContext = createContext(null);

export function useAccount() {
  return useContext(SessionContext);
}

// Changes the shared account (e.g. after it renames itself in User Management): takes the fields
// that changed.
export const AccountUpdateContext = createContext(() => {});

export function useUpdateAccount() {
  return useContext(AccountUpdateContext);
}

// "Portal Admin" → "PA"
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

// CITIZEN → Citizen
export function roleLabel(role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
