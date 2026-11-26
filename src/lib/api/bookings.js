import { protectedFetch } from "../core/server";

export const getMyBookings = async () => {
  return protectedFetch("/api/bookings/my");
};