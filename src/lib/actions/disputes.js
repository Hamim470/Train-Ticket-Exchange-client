import { serverMutation } from "../core/server";

export const reportBookingDispute = async (bookingId, payload) => {
  return serverMutation(`/api/bookings/${bookingId}/dispute`, payload, "POST");
};

export const resolveBookingDispute = async (disputeId, payload) => {
  return serverMutation(
    `/api/admin/disputes/${disputeId}/resolve`,
    payload,
    "PATCH"
  );
};