# Meridian Control Plane - Product Contract

## Product thesis

Meridian is an evidence-bound management control plane for InterSystems IRIS.
Selected administrative actions become typed Proof Contract V2 lifecycles:
preflighted, freshly revalidated, executed through bounded server authority,
reconciled when dispatch is ambiguous, verified on action-specific evidence
planes, and sealed into durable hash-bound Action Receipt V2 records.

The browser never receives a generic privileged mutation proxy. IRIS remains
authoritative for management state, runtime truth, audit, and persistence.

## Memorable primitive

PREFLIGHT -> REVALIDATE -> APPLY -> RECONCILE -> VERIFY -> PERSIST RECEIPT -> EXACT IRIS READBACK -> VERIFIED

## Core invariant

A privileged action is not complete when dispatch succeeds.

It is complete only when the reviewed target and pre-state still match at
dispatch time, the action-specific proof requirements close under authoritative
evidence, and the durable receipt persists and reads back exactly.

APPLIED is not VERIFIED.

## Proof Contract V2

Each fixed-purpose action contract declares:

- management domain;
- risk class;
- reversibility class;
- exact target identity;
- required authority;
- expected delta;
- safety predicates;
- evidence requirements;
- ambiguity reconciliation behavior; and
- recovery metadata.

UNKNOWN_AFTER_DISPATCH is a first-class state. Once dispatch may have happened,
Meridian reconciles authoritative state instead of blindly retrying a
consequential mutation.

Reversibility remains truthful. An irreversible process termination is recorded
as IRREVERSIBLE; recreating a process is not described as rollback of the same
identity.

## Certified breadth

The final certification set spans 19 fixed-purpose semantic actions on 14
official SysAdmin mutation endpoints:

- P01-P06: permission actions;
- T01-T06: task actions;
- O01-O03: process suspend, resume, and terminate; and
- W01-W04: web-application actions.

Maya Patel supervisor removal remains a recorded permissions case inside this
broader proof engine.

Logs and Security / Secrets remain evidence/read families in the submitted
product; Meridian does not claim certified mutation breadth for them.

## Coverage contract

The pinned public InterSystems Community SysAdmin API specification compiles to an explicit 273-primary-operation atlas, with 276 source operations including three HEAD protocol companions:

- 14 CERTIFIED_ACTION endpoints;
- 20 VERIFIED_READ operations;
- 95 EXPLORABLE_READ operations;
- 36 DECLINED_DESTRUCTIVE operations; and
- 108 OUT_OF_PRODUCT_SCOPE operations.

Coverage means every primary operation has an explicit product decision. It
does not mean every operation is executable.

## Architecture

Browser
-> Next.js UI
-> Next.js server BFF
-> Proof Contract V2 runner
-> fixed-purpose SysAdmin transports
-> action-specific IRIS evidence
-> durable Action Receipt V2 history

Rules:

- IRIS is authoritative.
- Privileged IRIS credentials never enter browser JavaScript.
- Official /api/admin is the primary management surface.
- Native helper boundaries stay narrow and server-owned.
- Execution, evidence completion, receipt persistence, and VERIFIED are separate concepts.
- Fresh revalidation must match the reviewed target and relevant pre-state before mutation.
- No blind automatic retry is allowed after ambiguous dispatch; reconciliation decides what is known.
- No generic browser mutation proxy is exposed.
- Risk and reversibility remain explicit, including IRREVERSIBLE process termination.
- Impact numbers must be derived from authoritative data, never marketing constants.

## Claim boundary

The product may describe:

- deployed route inventory as PROVEN;
- required-resource metadata as PROVEN DECLARED METADATA;
- resulting endpoint impact as DECLARED IMPACT;
- fixed-purpose actions as CERTIFIED only when their frozen evidence contract closed; and
- persistent receipts as historical evidence distinct from fresh current-state readback.

It must not claim:

- arbitrary application-code authorization inference;
- generic mutation support from a certified transport;
- mutation breadth for Logs or Security / Secrets;
- HTTP success as proof of operational closure; or
- process recreation as rollback of an irreversible terminated identity.

## Final submission objective

Make the proof standard immediately visible to judges: explicit coverage, bounded
authority, fresh revalidation, ambiguity reconciliation, action-specific
evidence, durable receipts, reproducibility, and clear claim boundaries without
weakening the certified action contracts.
