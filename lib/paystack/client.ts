import { env } from "@/lib/env";

const BASE = "https://api.paystack.co";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
  meta?: { next?: string | null; previous?: string | null; perPage?: number };
};

async function paystackFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<PaystackResponse<T>> {
  const { idempotencyKey, ...fetchInit } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...fetchInit,
    headers: {
      Authorization: `Bearer ${env.paystackSecret()}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(fetchInit.headers ?? {}),
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
  // Paystack's Nigerian list runs to 200+ entries, so a single page silently
  // drops most banks. Follow the cursor until exhausted and de-dupe by slug.
  async listBanks(country = "nigeria") {
    type Row = { name: string; code: string; slug: string };
    const banks: Row[] = [];
    const seen = new Set<string>();
    let next: string | null = null;
    let guard = 0;

    do {
      const qs = new URLSearchParams({ country, perPage: "100" });
      if (next) qs.set("next", next);
      const json = await paystackFetch<Row[]>(`/bank?${qs.toString()}`, { method: "GET" });
      for (const b of json.data) {
        const key = b.slug || `${b.name}|${b.code}`;
        if (!seen.has(key)) { seen.add(key); banks.push(b); }
      }
      next = json.meta?.next ?? null;
      guard += 1;
    } while (next && guard < 15);

    return { status: true, message: "ok", data: banks } satisfies PaystackResponse<Row[]>;
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
    idempotencyKey?: string;
  }) {
    const { idempotencyKey, ...rest } = body;
    return paystackFetch<{ transfer_code: string; status: string; reference: string }>(
      "/transfer",
      { method: "POST", body: JSON.stringify({ source: "balance", ...rest }), idempotencyKey },
    );
  },

  async getBalance() {
    return paystackFetch<Array<{ currency: string; balance: number }>>(
      "/balance",
      { method: "GET" },
    );
  },
};
