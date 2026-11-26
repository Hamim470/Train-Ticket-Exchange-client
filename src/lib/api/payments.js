import { protectedFetch } from "../core/server";

export const getEscrowPaymentStatus = async (tranId) => {
  return protectedFetch(`/api/payments/status/${encodeURIComponent(tranId)}`);
};