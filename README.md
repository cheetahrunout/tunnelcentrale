# Tunnelcentrale

LTS (Landelijke Tunnelstandaard) operations simulator for a motorway tunnel: two unidirectional tubes and a pressurised escape channel between them.

**Disclaimer: not for commercial use.** This is a training / education simulator only. You may not use it (or derivatives) commercially. It is not a certified tunnel-control system and must not be used to operate real tunnels. See [LICENSE](LICENSE).

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

## License

Non-commercial. Personal and educational use only. See [LICENSE](LICENSE).
