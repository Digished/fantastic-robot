import { env } from "@/lib/env";

const BASE = "https://api.paystack.co";

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function paystackFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<PaystackResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.paystackSecret()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !json.status) {
    throw new PaystackError(json.message || `Paystack ${res.status}`, json);
  }
  return json;
}

export class PaystackError extends Error {
  constructor(message: string, public payload?: unknown) { super(message); }
}

export const paystack = {
  async listBanks(country = "nigeria") {
    return paystackFetch<Array<{ name: string; code: string; slug: string }>>(
      `/bank?country=${country}&perPage=100`,
      { method: "GET" },
    );
  },

  async resolveAccount(account_number: string, bank_code: string) {
    const qs = new URLSearchParams({ account_number, bank_code });
    return paystackFetch<{ account_number: string; account_name: string }>(
      `/bank/resolve?${qs.toString()}`,
      { method: "GET" },
    );
  },

  async initTransaction(body: {
    email: string;
    amount: number;            // kobo
    reference: string;
    callback_url: string;
    metadata?: Record<string, unknown>;
  }) {
    return paystackFetch<{ authorization_url: string; reference: string; access_code: string }>(
      "/transaction/initialize",
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  async verifyTransaction(reference: string) {
    return paystackFetch<{
      reference: string;
      status: string;
      amount: number;
      metadata?: Record<string, unknown> | null;
      id?: number;
    }>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET" },
    );
  },

  async createTransferRecipient(body: {
    name: string;
    account_number: string;
    bank_code: string;
    currency?: "NGN";
  }) {
    return paystackFetch<{ recipient_code: string }>(
      "/transferrecipient",
      { method: "POST", body: JSON.stringify({ type: "nuban", currency: "NGN", ...body }) },
    );
  },

  async initiateTransfer(body: {
    amount: number;            // kobo
    recipient: string;         // recipient_code
    reference: string;
    reason?: string;
  }) {
    return paystackFetch<{ transfer_code: string; status: string; reference: string }>(
      "/transfer",
      { method: "POST", body: JSON.stringify({ source: "balance", ...body }) },
    );
  },
};
