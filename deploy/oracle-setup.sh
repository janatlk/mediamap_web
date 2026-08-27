#!/usr/bin/env bash
#
# Подготовка машины Oracle Cloud Always Free под MediaMap.
#
# Делает ровно то, что в docs/deploy-oracle.md разделы 2-3 и в deploy.md
# шаги 1-2: пакеты, пользователь, оба межсетевых экрана, каталоги. Секреты,
# сборку и запуск служб не трогает — их ставят руками, по инструкции.
#
# Запускать от root на свежей Ubuntu 24.04 (aarch64):
#   sudo bash oracle-setup.sh
#
# Повторный запуск безопасен: всё, что уже сделано, пропускается.

set -euo pipefail

USER_NAME=mediamap
ROOT_DIR=/srv/mediamap
WEB_REPO=https://github.com/janatlk/mediamap_web.git

say() { printf '\n=== %s\n' "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Нужен root: sudo bash $0" >&2
  exit 1
fi

say "Пакеты"
apt-get update -qq
apt-get install -y -qq git curl ca-certificates debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
echo "node $(node -v), npm $(npm -v)"

apt-get install -y -qq python3.12 python3.12-venv
echo "$(python3.12 -V)"

if ! command -v caddy >/dev/null; then
  # Caddy держит свой репозиторий; в Ubuntu его нет.
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq caddy
fi
echo "$(caddy version)"

say "Пользователь и каталоги"
if ! id "$USER_NAME" >/dev/null 2>&1; then
  adduser --system --group --home "$ROOT_DIR" "$USER_NAME"
fi
mkdir -p "$ROOT_DIR"

say "Код сайта"
if [ ! -d "$ROOT_DIR/web/.git" ]; then
  git clone --quiet "$WEB_REPO" "$ROOT_DIR/web"
else
  echo "уже склонирован, пропускаю"
fi
mkdir -p "$ROOT_DIR/web/uploads"
chown -R "$USER_NAME:$USER_NAME" "$ROOT_DIR"

say "Межсетевой экран машины"
# Второй, облачный, открывается в консоли Oracle — скриптом до него не
# дотянуться. Об этом напоминает вывод в конце.
for port in 80 443; do
  if iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    echo "порт $port уже открыт"
  else
    # Вставляем выше правила REJECT, которое в образах Oracle идёт последним.
    iptables -I INPUT 6 -p tcp --dport "$port" -j ACCEPT
    echo "порт $port открыт"
  fi
done
netfilter-persistent save >/dev/null
echo "правила сохранены — переживут перезагрузку"

cat <<'DONE'

=== Готово. Что осталось сделать руками

1. В консоли Oracle: Networking → VCN → Subnet → Security List →
   Add Ingress Rules. Source 0.0.0.0/0, TCP, порты 80 и 443.
   Без этого снаружи ничего не откроется, сколько ни правь iptables.

2. Склонировать ML-сервис в /srv/mediamap/ml и поставить его —
   docs/deploy-oracle.md раздел 3 (там про torch под ARM).

3. Заполнить /srv/mediamap/web/.env — обязательны DATABASE_URL и SITE_URL.

4. Дальше по docs/deploy.md, шаги 3 и 5-7:
   npm ci && npx prisma migrate deploy && npx prisma generate && npm run build
   службы, Caddyfile, первый администратор, адрес возврата Google.

DONE
