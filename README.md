# Tunnelcentrale

LTS (Landelijke Tunnelstandaard) operations simulator for a motorway tunnel: two unidirectional tubes and a pressurised escape channel between them.

## What it is

A traffic-control desk for the fictional A12 **Waterlinietunnel**.

- Live 2D schematic with traffic, cameras, hulpposten, jet fans and vluchtdeuren
- LTS plant board (CCTV, AID, linear fire detection, lighting, extraction, fire main, overpressure, omroep, barriers, matrix signs, pumps, UPS)
- Scenarios: accident, vehicle fire, stopped vehicle, overheight
- Automatic LTS protocol (or manual plant)
- 3D cutaway, portal views, drive-through and escape corridor

## Run

```bash
npm install
npm run dev
```

The app listens on port 8080.

```bash
npm run build
npm run preview
```

## Stack

React 19, TanStack Start, Tailwind v4, Zustand, Three.js / React Three Fiber.
