# torsion-spring-calc

A TypeScript CLI for helical torsion spring design checks. Requires Node.js 18 or newer. No runtime dependencies.

```sh
npm install
npm test
node dist/cli.js --wire 2 --mean-dia 20 --turns 10
node dist/cli.js --wire 2 --mean-dia 20 --turns 10 --moment 500 --allow 1000
node dist/cli.js --wire 2 --mean-dia 20 --turns 10 --angle 90 --json
```

The package bin is `torsion-spring-calc` (built at `dist/cli.js`). After `npm link`, invoke it by that name. `npm run build` compiles the sources; `npm test` builds and runs the Node test runner.

Required flags: `--wire` (wire diameter in mm), `--mean-dia` (mean body diameter in mm, greater than wire diameter), and `--turns` (active body turns). All must be positive. `--modulus` is elastic modulus in MPa, positive, default 200000. Supply either `--moment` in N·mm or `--angle` in degrees, or omit both to print rates and index only. `--allow` supplies a positive allowable bending stress in MPa and adds a safety factor when a load is supplied. `--json` selects JSON; `--help` lists options. Numeric flags accept signed decimal and scientific notation. Repeated and unknown flags are errors.

For the 2 mm wire, 20 mm mean diameter, 10 turn example, the rate is 250.00 N·mm/rad or 4.3633 N·mm/deg. A 500 N·mm moment gives 2.0000 rad (114.59°), 687.9 MPa bending stress, and 19.383 mm wound mean diameter. With allowable stress 1000 MPa, the safety factor is 1.454. A 90° deflection gives 392.70 N·mm.

## Model and units

Straight-leg end effects are ignored; there is no friction factor. This is an ideal elastic body-turn model with constant elastic modulus, not a fatigue, buckling, clearance, or yield analysis.

- `k_rad = E d⁴ / (64 D N)` in N·mm/rad.
- `k_deg = k_rad π/180`; rate per full turn is `k_rad 2π`.
- `M = k_deg a`; `θ_rad = M/k_rad`.
- `C = D/d`; inner-fibre factor `Ki = (4C² − C − 1)/(4C(C − 1))`.
- Bending stress magnitude `σ = Ki 32|M|/(πd³)` in MPa; safety factor is `S/σ`.
- Wound mean diameter `D′ = DN/(N + θ_rad/(2π))`; inner diameter is `D′ − d`.

Positive moment/angle winds up the spring. Negative input unwinds it; stress is reported as a magnitude. A nonpositive wound turn count is rejected. Zero load has zero stress and infinite safety factor (printed as `Infinity` in the table, `null` in JSON). Numeric overflow is rejected. All calculations use unrounded values; only the table rounds for display.

JSON uses `rateRad`, `rateDeg`, `rateTurn`, `index`, and `innerFibreFactor`; loaded results also include `moment`, `angleRad`, `angleDeg`, `stress`, `woundMeanDiameter`, `innerDiameter`, and, when requested, `safetyFactor`. Units are as above.

Errors go to stderr with exit status 1. Index outside 4–16 produces a warning on stderr while returning status 0; JSON stdout remains machine readable.

## License

MIT, copyright shanguoao2026-web.
