import { protectedFetch } from "../core/server";

export const getAdminDisputes = async (status = "all") => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return protectedFetch(`/api/admin/disputes${query}`);
};