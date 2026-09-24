import { corsHeaders } from "./cors.ts";

export type ApiErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "INVALID_REQUEST"
  | "INVALID_PAYMENT_TOKEN"
  | "INVALID_PAYMENT_METHOD"
  | "PAYMENT_NOT_ALLOWED"
  | "PAYMENT_ALREADY_COMPLETED"
  | "PAYMENT_ATTEMPT_CONFLICT"
  | "PROVIDER_INIT_FAILED"
  | "INTERNAL_ERROR";

export function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export function successResponse(
  transaction: {
    reference: string;
    amount: number;
    currency: string;
    payment_method: string;
    status: string;
    checkout_url: string;
    reused: boolean;
  },
): Response {
  return jsonResponse(
    {
      success: true,
      transaction,
    },
    200,
  );
}

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    status,
  );
}