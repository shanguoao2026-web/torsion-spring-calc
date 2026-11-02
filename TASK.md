# torsion-spring-calc

Build a small TypeScript Node CLI (Node 18+, no runtime deps; devDeps typescript + @types/node only; tests with node:test) for helical torsion spring design checks.

Inputs: --wire d (mm, required, >0), --mean-dia D (mm, required, > d), --turns N (active body turns, required, >0), --modulus E (MPa, default 200000), exactly one of --moment M (N·mm) or --angle a (degrees) (optional; neither given → print rate only; both → error), --allow S (MPa, optional allowable bending stress, prints safety factor S/σ), --json, --help.
Formulas (straight-leg end effects ignored, no friction factor):
- Rate k_rad = E·d⁴ / (64·D·N) N·mm/rad; k_deg = k_rad·π/180 N·mm/deg; also N·mm per turn = k_rad·2π.
- Moment ↔ angle: M = k_deg·a; θ_rad = M/k_rad.
- Spring index C = D/d; inner-fibre factor Ki = (4C² − C − 1) / (4C(C − 1)); bending stress σ = Ki·32M/(π·d³).
- Wound-up mean diameter D' = D·N / (N + θ_rad/(2π)); inner diameter D' − d.
- Validate finite numbers; errors to stderr with exit 1. Warn (stderr, exit 0) if C < 4 or C > 16.
- Table output by default, README with examples and the stated simplifications, MIT LICENSE (author shanguoao2026-web), .gitignore with node_modules/ dist/ *.log .npm-cache/.
- package.json "bin" must point to the built CLI. npm test must build and pass. No secrets, no personal info.

Check values (must be in tests):
- d2 D20 N10 E200000 → k_rad 250.00 N·mm/rad, k_deg 4.3633 N·mm/deg, C 10, Ki 1.0806.
- + moment 500 → θ 2.0000 rad = 114.59°, σ 687.9 MPa, D' 19.383 mm.
- + angle 90 → M 392.70 N·mm.
- + moment 500 allow 1000 → safety factor 1.454.
- d 20 with D 20 → exit 1; turns 0 → exit 1; moment and angle together → exit 1.
