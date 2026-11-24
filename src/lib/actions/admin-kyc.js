"use server";

import { protectedFetch, serverMutation } from "../core/server";

export const getAdminKycQueue = async (status = "pending") => {
  return protectedFetch(`/api/admin/kyc?status=${status}`);
};

export const reviewAdminKyc = async (userId, payload) => {
  return serverMutation(`/api/admin/kyc/${userId}`, payload, "PATCH");
};