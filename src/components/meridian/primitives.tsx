import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="meridian-page-header">
      <div>
        {eyebrow ? <p className="meridian-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="meridian-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="meridian-page-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="meridian-section-header">
      <div>
        {eyebrow ? <p className="meridian-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span className="meridian-status" data-tone={tone}>
      <span className="meridian-status-dot" />
      {children}
    </span>
  );
}

export function MetricCell({
  label,
  value,
  detail,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="meridian-metric-cell">
      <span>{label}</span>
      <strong className={mono ? "meridian-mono" : undefined}>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function CodeValue({
  children,
  truncate = false,
}: {
  children: ReactNode;
  truncate?: boolean;
}) {
  return (
    <code
      className={joinClasses(
        "meridian-code-value",
        truncate && "meridian-code-value-truncate",
      )}
    >
      {children}
    </code>
  );
}

export function EvidenceBlock({
  label,
  title,
  children,
  tone = "neutral",
}: {
  label?: string;
  title?: string;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <section className="meridian-evidence-block" data-tone={tone}>
      {label || title ? (
        <header>
          {label ? <span>{label}</span> : null}
          {title ? <strong>{title}</strong> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </section>
  );
}

export type EvidenceStep = {
  label: string;
  detail?: string;
  state: "complete" | "active" | "pending" | "failed";
};

export function EvidenceRail({
  steps,
  orientation = "horizontal",
}: {
  steps: EvidenceStep[];
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <ol className="meridian-evidence-rail" data-orientation={orientation}>
      {steps.map((step, index) => (
        <li data-state={step.state} key={`${step.label}-${index}`}>
          <span className="meridian-evidence-node">{index + 1}</span>
          <span className="meridian-evidence-copy">
            <strong>{step.label}</strong>
            {step.detail ? <small>{step.detail}</small> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function KeyValueInspector({
  rows,
}: {
  rows: Array<{
    label: string;
    value: ReactNode;
    mono?: boolean;
  }>;
}) {
  return (
    <dl className="meridian-kv">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd className={row.mono ? "meridian-mono" : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({
  eyebrow = "No records",
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="meridian-empty-state">
      <p className="meridian-eyebrow">{eyebrow}</p>
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function AuthorityCallout({
  eyebrow,
  title,
  detail,
  tone = "info",
  children,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  tone?: Tone;
  children?: ReactNode;
}) {
  return (
    <aside className="meridian-authority-callout" data-tone={tone}>
      <span className="meridian-callout-rule" />
      <div>
        <p className="meridian-eyebrow">{eyebrow}</p>
        <strong>{title}</strong>
        {detail ? <p>{detail}</p> : null}
        {children}
      </div>
    </aside>
  );
}
