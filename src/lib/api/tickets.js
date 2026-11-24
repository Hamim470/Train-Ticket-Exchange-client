import { protectedFetch, serverFetch } from "../core/server";

export const getAdminTickets = async (status = "pending_approval") => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return protectedFetch(`/api/admin/tickets/pending${query}`);
};

export const getMyListings = async () => {
  return protectedFetch("/api/tickets/my-listings");
};

export const getPublicTickets = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.date) params.set("date", filters.date);

  const qs = params.toString();
  return serverFetch(`/api/tickets${qs ? `?${qs}` : ""}`);
};