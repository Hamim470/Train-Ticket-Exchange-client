import { serverMutation } from "../core/server";

export const confirmJourneyReleaseEscrow = async (bookingId) => {
  return serverMutation(
    `/api/bookings/${bookingId}/confirm-journey`,
    {},
    "PATCH"
  );
};