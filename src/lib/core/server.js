import { redirect } from "next/navigation";
import { getUserToken } from "./session";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

export const authHeader = async () => {
  const token = await getUserToken();
  return token ? { authorization: `Bearer ${token}` } : {};
};

export const serverFetch = async (path) => {
  const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

export const protectedFetch = async (path) => {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: await authHeader(),
    cache: "no-store",
  });
  return handleStatusCode(res);
};

export const serverMutation = async (path, data, method = "POST") => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(data),
  });
  return handleStatusCode(res);
};

const handleStatusCode = async (res) => {
  if (res.status === 401) {
    redirect("/login");
  } else if (res.status === 403) {
    redirect("/forbidden");
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};