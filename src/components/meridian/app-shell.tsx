"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  detail: string;
  glyph: "control" | "cases" | "proof" | "new" | "system" | "tasks" | "logs" | "web" | "secrets";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Change control",
    items: [
      { href: "/", label: "Control room", detail: "Operational overview", glyph: "control" },
      { href: "/change-cases", label: "Change cases", detail: "Queue and evidence", glyph: "cases" },
      { href: "/proof", label: "Proof", detail: "Verified receipts", glyph: "proof" },
      { href: "/change-cases/new", label: "New case", detail: "Preflight a request", glyph: "new" },
    ],
  },
  {
    label: "Runtime",
    items: [
      { href: "/system", label: "System", detail: "IRIS runtime", glyph: "system" },
      { href: "/tasks", label: "Tasks", detail: "Task authority", glyph: "tasks" },
      { href: "/logs", label: "Logs", detail: "Execution evidence", glyph: "logs" },
    ],
  },
  {
    label: "Surfaces",
    items: [
      { href: "/web-rest", label: "Web + REST", detail: "Handler atlas", glyph: "web" },
      { href: "/security-secrets", label: "Security", detail: "Secret boundary", glyph: "secrets" },
    ],
  },
];

function Glyph({ kind }: { kind: NavItem["glyph"] }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (kind === "control") {
    return (
      <svg {...common}>
        <path d="M2.5 3.5h4v4h-4zM9.5 3.5h4v2.5h-4zM9.5 8.5h4v4h-4zM2.5 10h4v2.5h-4z" />
      </svg>
    );
  }

  if (kind === "cases") {
    return (
      <svg {...common}>
        <path d="M3 2.75h7.5L13 5.25v8H3z" />
        <path d="M10.5 2.75v2.5H13M5.25 8h5.5M5.25 10.5h4" />
      </svg>
    );
  }

  if (kind === "proof") {
    return (
      <svg {...common}>
        <path d="M3 2.75h10v10.5H3z" />
        <path d="M5 5.25h6M5 8h3.5M5 10.75h3" />
        <path d="M9.75 10.25l1 1 2-2.25" />
      </svg>
    );
  }
  if (kind === "new") {
    return (
      <svg {...common}>
        <path d="M8 3v10M3 8h10" />
      </svg>
    );
  }

  if (kind === "system") {
    return (
      <svg {...common}>
        <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
        <path d="M5 6h6M5 8.5h3.5M5 11h5" />
      </svg>
    );
  }

  if (kind === "tasks") {
    return (
      <svg {...common}>
        <path d="M3 4.25l1.25 1.25L6.5 3.25M8 4.5h5M3 8l1.25 1.25L6.5 7M8 8.25h5M3 11.75L4.25 13 6.5 10.75M8 12h5" />
      </svg>
    );
  }

  if (kind === "logs") {
    return (
      <svg {...common}>
        <path d="M3 2.75h10v10.5H3zM5 5.25h6M5 8h6M5 10.75h4" />
      </svg>
    );
  }

  if (kind === "web") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="5.25" />
        <path d="M2.75 8h10.5M8 2.75c1.35 1.45 2 3.2 2 5.25s-.65 3.8-2 5.25C6.65 11.8 6 10.05 6 8s.65-3.8 2-5.25z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 7V5.5a4 4 0 0 1 8 0V7M3 7h10v6H3z" />
      <path d="M8 9.25v1.5" />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/change-cases") {
    return pathname === "/change-cases" || pathname.startsWith("/change-cases/verified/");
  }
  return pathname === href;
}

function BrandMark() {
  return (
    <div className="meridian-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="meridian-shell">
      <a className="meridian-skip-link" href="#meridian-workspace">
        Skip to workspace
      </a>
      <aside className="meridian-rail">
        <Link href="/" className="meridian-brand" aria-label="Meridian control room">
          <BrandMark />
          <span>
            <strong>Meridian</strong>
            <small>Control plane</small>
          </span>
        </Link>

        <nav className="meridian-nav" aria-label="Primary">
          {navGroups.map((group) => (
            <div className="meridian-nav-group" key={group.label}>
              <p className="meridian-nav-label">{group.label}</p>
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    className="meridian-nav-link"
                    aria-current={active ? "page" : undefined}
                    data-active={active ? "true" : "false"}
                    href={item.href}
                    key={item.href}
                  >
                    <span className="meridian-nav-glyph">
                      <Glyph kind={item.glyph} />
                    </span>
                    <span className="meridian-nav-copy">
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <span className="meridian-nav-indicator" />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="meridian-rail-footer">
          <span className="meridian-live-dot" aria-hidden="true" />
          <span>
            <strong>IRIS-backed</strong>
            <small>Evidence authority</small>
          </span>
        </div>
      </aside>

      <div className="meridian-stage">
        <header className="meridian-environment-strip">
          <div className="meridian-mobile-brand">
            <BrandMark />
            <strong>Meridian</strong>
          </div>

          <div className="meridian-context">
            <span className="meridian-context-label">Environment</span>
            <strong>Local certification</strong>
          </div>

          <div className="meridian-context">
            <span className="meridian-context-label">Authority</span>
            <strong>InterSystems IRIS</strong>
          </div>

          <div className="meridian-context meridian-context-end">
            <span className="meridian-context-label">Mode</span>
            <strong>Evidence-bound</strong>
          </div>
        </header>

        <nav className="meridian-mobile-nav" aria-label="Mobile navigation">
          {navGroups.flatMap((group) => group.items).map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
                href={item.href}
                key={item.href}
              >
                <Glyph kind={item.glyph} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div id="meridian-workspace" className="meridian-workspace" tabIndex={-1}>{children}</div>
      </div>
    </div>
  );
}
