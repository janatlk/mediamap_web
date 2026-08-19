import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeUrl, isConfigured, isProviderId } from "@/lib/oauth";

// Начало входа через чужой сервис: уводим человека к нему на согласие.

const STATE_COOKIE = "mm_oauth_state";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!isProviderId(provider) || !isConfigured(provider)) {
    return NextResponse.redirect(new URL("/ru/account/login", process.env.SITE_URL ?? "http://localhost:3000"));
  }

  /*
    Случайная строка, которую сервис вернёт обратно.

    Без неё чужой сайт может подсунуть человеку ссылку возврата со своим
    кодом и привязать его аккаунт к себе. Кладём её в куку и сверяем на
    возврате: подделать куку с чужого домена нельзя.
  */
  const state = randomUUID();
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(authorizeUrl(provider, state));
}
