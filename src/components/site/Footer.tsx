import Link from "next/link";

import type { Dictionary } from "@/lib/content";

type Props = { dict: Dictionary };

export default function Footer({ dict }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-base font-medium">{dict.brand}</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              {dict.brandTagline}
            </p>
          </div>

          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/map" className="py-2 text-muted hover:text-signal">
              {dict.nav.map}
            </Link>
            <Link href="/categories" className="py-2 text-muted hover:text-signal">
              {dict.nav.categories}
            </Link>
            <Link href="/about" className="py-2 text-muted hover:text-signal">
              {dict.nav.about}
            </Link>
            <Link href="/admin" className="py-2 text-muted hover:text-signal">
              {dict.footer.admin}
            </Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="font-mono text-2xs text-muted">
            © {year} · {dict.footer.rights}
          </p>
          {/* Лицензия ODbL требует указать источник границ. */}
          <p className="mt-2 font-mono text-2xs text-muted">
            {dict.footer.boundaries}
          </p>
        </div>
      </div>
    </footer>
  );
}
