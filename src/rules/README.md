# src/rules — Owner: Agent 4 (Gameplay & UI)

Purpose: pure gameplay rules — plain modules, no 3D and no React inside. Every
rule is a function `(state, input) => newState`; Engine (Agent 2) wires them
into the store (`src/store/gameStore.ts`) when asked (G-001 handshake).

Spot map for Daavi's corner (G-008d) — the one-press-one-meaning contract.
Coordinates are the ACCRA MAP's (the v6 world swap moved Daavi's corner to
the Jamestown DAAVI_PLOT; the starter block is gone):

| id | where | what happens there | nothing else |
|----|-------|--------------------|--------------|
| `LOC-001` | front counter (−126.5, −1.85, r 2.5) | `Buy waakye ₵12` / `Full` (hunger > 80) / `Not enough cash` | no job actions, ever |
| `LOC-001-JOB` | job spot (−122.9, −2.4, r 0.9, `proximity.DAAVI_JOB_SPOT`) | `Help Daavi` / steps 1+3 (`Grab pans`, `Get paid`) / cooldown + canWork refusals | no purchases, ever |
| `LOC-001-BENCH` | bench waypoint (−132.5, −0.6, r 2.5, `proximity.DAAVI_BENCH` — the plot pavement west of the kiosk) | step 2 (`Carry Pans`) | wrong-spot redirects naming the right spot |
| `LOC-002` | the reserved plot's sleep yard AABB (x −142…−131, z −12…−1.4) | `Sleep` (free, +55/−8, gate 90) | |

The counter and job-spot zones are geometrically disjoint (3.61 m between
centres > 2.5 + 0.9 — swept by a test); `nearestLocationId` priority is
sleep zone > bench > job spot > point locations, and since G-008e the
ZONE-BACKED ids (`LOC-001-JOB`, `LOC-001-BENCH`) never win the generic
point loop — they resolve only through their own zone checks, so a data
row can never lend a zone the default 2.5 m reach. Meal gate
`WAAKYE_MAX_HUNGER` 80, water gate `WATER_MAX_HUNGER` 90, meals and jobs
each rest from their own stamp (`cooldownRemaining`, clocks via the
session's `nowMs` — never `Date.now()`).

Created empty by Agent 2 in E-001 (skeleton). Agent 4: replace this file with
real content.
