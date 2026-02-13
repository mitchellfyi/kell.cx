import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-zinc-500">
            Built by{" "}
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
              Kell
            </Link>
            {" · "}
            <Link href="mailto:hi@kell.cx" className="text-zinc-400 hover:text-white transition-colors">
              hi@kell.cx
            </Link>
          </p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link href="/data" className="hover:text-white transition-colors">
              Data
            </Link>
            <a
              href="https://github.com/kellaionline"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
