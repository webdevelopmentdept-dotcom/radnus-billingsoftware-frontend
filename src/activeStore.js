// src/activeStore.js
// Phase 3B — admin entha store-a paakkaraar nu sessionStorage-la vachukkum.
// Token-oda serthu save pannurom, adhunaala logout/login pannaa (vera token) thaanaa reset aagum.
// "all" / illa = ella store (pazhaya maariye).
const KEY = "activeStore";

export const getActiveStoreId = () => {
  try {
    const token = sessionStorage.getItem("token");
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!token || user.role !== "admin") return null;            // admin mattum
    const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return v && v.token === token && v.id && v.id !== "all" ? v.id : null;
  } catch {
    return null;
  }
};

export const setActiveStoreId = (id) => {
  const token = sessionStorage.getItem("token");
  if (!id || id === "all") sessionStorage.removeItem(KEY);
  else sessionStorage.setItem(KEY, JSON.stringify({ token, id }));
};