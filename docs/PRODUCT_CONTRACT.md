# Meridian Control Plane — Product Contract

## Product thesis

An IRIS security-change control plane that preflights what a role change will
unlock or remove, traces the impact through protected applications and
discoverable REST operations, applies the change through supported IRIS
management mechanisms, and keeps that change open until observed live process
access converges with intended configuration, with native IRIS audit evidence
closing the loop.

## Memorable primitive

PRE-FLIGHT -> APPLY -> CONVERGE

## Core invariant

A security change is not complete when configuration changes.

It is complete when observed live effective access has converged to the intended
configuration and the evidence chain required by the Change Case is satisfied.

## First vertical slice

Maya Patel

REMOVE MeridianSupervisor FROM maya.patel

Lifecycle:

PROPOSED
-> PREFLIGHTED
-> READY
-> APPLIED
-> CONVERGING
-> VERIFIED

Safety states:

- STALE
- APPLY_FAILED
- AUDIT_PENDING

## Architecture

Browser
-> Next.js UI
-> Next.js server BFF
-> IRIS management adapter
-> supported IRIS security/process/REST/audit capabilities

Rules:

- IRIS is authoritative.
- Privileged IRIS credentials never enter browser JavaScript.
- Official /api/admin is the primary management surface.
- Native helper stays narrow.
- CONFIGURATION and LIVE ACCESS are separate concepts.
- Impact numbers must be derived from authoritative data, never marketing constants.
- No automatic process termination.
- No arbitrary public security mutation.
- No generic management-dashboard expansion before the vertical lifecycle works.

## Claim boundary

The product may describe:

- deployed route inventory as PROVEN;
- required-resource metadata as PROVEN DECLARED METADATA;
- resulting endpoint impact as DECLARED IMPACT.

It must not claim arbitrary application-code authorization inference.

## Checkpoint 2 objective

Make one Change Case judgeable end-to-end before adding horizontal breadth.