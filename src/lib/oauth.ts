// Вход через чужие сервисы.
//
// Ключей в коде нет и быть не может — репозиторий публичный. Каждый сервис
// включается сам, как только в окружении появятся его ключи; пока их нет,
// кнопка просто не показывается. Так сайт не обещает того, чего не умеет.
//
// Библиотеки намеренно не берём: у нас уже есть свои сессии в базе, а любой
// готовый набор тянет вторую систему входа, и дальше приходится держать в
// голове две.

export type ProviderId = "google" | "facebook";

type Provider = {
  id: ProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
};

const PROVIDERS: Record<ProviderId, Provider> = {
  google: {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me?fields=id,name,email",
    scope: "email public_profile",
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  },
};

export const isProviderId = (value: string): value is ProviderId =>
  value === "google" || value === "facebook";

/** Настроен ли вход через сервис: есть ли оба ключа. */
export const isConfigured = (id: ProviderId): boolean =>
  Boolean(PROVIDERS[id].clientId && PROVIDERS[id].clientSecret);

/** Сервисы, готовые к работе. Пустой список — значит кнопок не будет. */
export const availableProviders = (): { id: ProviderId; label: string }[] =>
  (Object.keys(PROVIDERS) as ProviderId[])
    .filter(isConfigured)
    .map((id) => ({ id, label: PROVIDERS[id].label }));

/**
 * Куда сервис вернёт человека после согласия.
 *
 * Адрес сайта берётся из окружения: на сервере он не совпадает с localhost,
 * а собирать его из заголовков запроса — способ подставить чужой домен.
 */
export const callbackUrl = (id: ProviderId): string => {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return `${base}/api/auth/${id}/callback`;
};

export function authorizeUrl(id: ProviderId, state: string): string {
  const provider = PROVIDERS[id];
  const params = new URLSearchParams({
    client_id: provider.clientId ?? "",
    redirect_uri: callbackUrl(id),
    response_type: "code",
    scope: provider.scope,
    state,
  });
  return `${provider.authorizeUrl}?${params}`;
}

export type ExternalProfile = {
  externalId: string;
  email: string | null;
  name: string | null;
};

/** Меняет код на профиль. Бросает, если сервис ответил отказом. */
export async function fetchProfile(
  id: ProviderId,
  code: string,
): Promise<ExternalProfile> {
  const provider = PROVIDERS[id];

  const tokenResponse = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: provider.clientId ?? "",
      client_secret: provider.clientSecret ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(id),
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`${provider.label}: обмен кода не удался`);
  }

  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) throw new Error(`${provider.label}: нет токена`);

  const profileResponse = await fetch(provider.profileUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`${provider.label}: профиль не получен`);
  }

  const profile = (await profileResponse.json()) as {
    sub?: string;
    id?: string;
    email?: string;
    name?: string;
  };

  const externalId = profile.sub ?? profile.id;
  if (!externalId) throw new Error(`${provider.label}: профиль без опознания`);

  return {
    externalId,
    email: profile.email ?? null,
    name: profile.name ?? null,
  };
}
