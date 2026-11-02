#!/usr/bin/env node
import { calculate, type Inputs } from './spring.js';

const help = `Usage: torsion-spring-calc --wire d --mean-dia D --turns N [options]

  --wire d       Wire diameter (mm, > 0, required)
  --mean-dia D   Mean diameter (mm, > wire, required)
  --turns N      Active body turns (> 0, required)
  --modulus E    Elastic modulus (MPa, > 0, default 200000)
  --moment M     Applied moment (N·mm)
  --angle a      Deflection (degrees); mutually exclusive with --moment
  --allow S      Allowable bending stress (MPa, > 0)
  --json         Print JSON instead of a table
  --help         Show this help

Omit both moment and angle for rate only. Positive loads wind up the spring.
Straight-leg end effects and friction are ignored.
`;

try {
  const args = process.argv.slice(2);
  const keys: Record<string, keyof Inputs> = {
    '--wire': 'wire', '--mean-dia': 'meanDiameter', '--turns': 'turns',
    '--modulus': 'modulus', '--moment': 'moment', '--angle': 'angle', '--allow': 'allow',
  };
  const input: Partial<Inputs> = {};
  const seen = new Set<string>();
  let json = false;
  let showHelp = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error(`duplicate option: ${flag}`);
    seen.add(flag);
    if (flag === '--help') { showHelp = true; continue; }
    if (flag === '--json') { json = true; continue; }
    const key = keys[flag];
    if (!key) throw new Error(`unknown option: ${flag}`);
    const raw = args[++i];
    if (raw === undefined || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) {
      throw new Error(`${flag} requires a finite number`);
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${flag} requires a finite number`);
    input[key] = value;
  }
  if (showHelp) {
    console.log(help);
  } else {
    for (const key of ['wire', 'meanDiameter', 'turns'] as const) {
      if (input[key] === undefined) throw new Error(`missing required option: ${key === 'meanDiameter' ? '--mean-dia' : `--${key}`}`);
    }
    const result = calculate(input as Inputs);
    if (result.index < 4 || result.index > 16) console.error('Warning: spring index C is outside the recommended range 4–16.');
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      const labels: Record<string, [string, string, number]> = {
        rateRad: ['Rate', 'N·mm/rad', 2], rateDeg: ['Rate', 'N·mm/deg', 4],
        rateTurn: ['Rate per turn', 'N·mm/turn', 2], index: ['Spring index C', '', 4],
        innerFibreFactor: ['Inner-fibre factor Ki', '', 4], moment: ['Moment', 'N·mm', 2],
        angleRad: ['Deflection', 'rad', 4], angleDeg: ['Deflection', 'deg', 2],
        stress: ['Bending stress', 'MPa', 1], woundMeanDiameter: ['Wound mean diameter', 'mm', 3],
        innerDiameter: ['Wound inner diameter', 'mm', 3], safetyFactor: ['Safety factor', '', 3],
      };
      console.log(`${'Quantity'.padEnd(24)} ${'Value'.padStart(14)}  Unit`);
      for (const [key, value] of Object.entries(result)) {
        const [label, unit, digits] = labels[key];
        console.log(`${label.padEnd(24)} ${(value === null ? 'Infinity' : value.toFixed(digits)).padStart(14)}  ${unit}`);
      }
    }
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
