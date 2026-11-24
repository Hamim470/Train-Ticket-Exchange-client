"use server";

import { serverMutation } from "../core/server";

export const createTicketListing = async (ticketData) => {
  return serverMutation("/api/tickets", ticketData, "POST");
};

export const reviewTicketListing = async (ticketId, payload) => {
  return serverMutation(`/api/admin/tickets/${ticketId}/review`, payload, "PATCH");
};

export const lockTicketListing = async (ticketId) => {
  return serverMutation(`/api/tickets/${ticketId}/lock`, {}, "POST");
};

export const unlockTicketListing = async (ticketId) => {
  return serverMutation(`/api/tickets/${ticketId}/unlock`, {}, "POST");
};