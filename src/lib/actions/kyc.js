"use server";

import { serverMutation } from "../core/server";

export const kyc = async (nidData) => {
  return serverMutation("/api/kyc", nidData, "POST");
};