"use server";

import {  serverMutation } from "../core/server";

export const initiateSslczPayment = async (ticketId) => {
  return serverMutation("/api/payments/initiate", { ticketId }, "POST");
};

