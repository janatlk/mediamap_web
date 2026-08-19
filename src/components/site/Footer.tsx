import Link from "next/link";

import type { Dictionary, Lang } from "@/lib/i18n";

type Props = { dict: Dictionary; lang: Lang };

export default function Footer({ dict, lang }: Props) {
  const year = new Date().getFullYear();

  const links = [
    { href: `/${lang}/cases`, label: dict.nav.cases },
    { href: `/${lang}/types`, label: dict.nav.types },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/contacts`, label: dict.nav.contacts },
    { href: "/admin", label: dict.footer.admin },
  ];

  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-base font-medium">{dict.brand}</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              {dict.brandTagline}
            </p>
          </div>

          <nav className="flex flex-col text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2 text-muted transition-colors hover:text-signal"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-10 border-t border-line pt-6 font-mono text-2xs text-muted">
          © {year} · {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
