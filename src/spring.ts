export interface Inputs {
  wire: number;
  meanDiameter: number;
  turns: number;
  modulus?: number;
  moment?: number;
  angle?: number;
  allow?: number;
}

export function calculate(input: Inputs) {
  const { wire: d, meanDiameter: D, turns: N, modulus: E = 200000, moment, angle, allow } = input;
  for (const [name, value] of Object.entries(input)) {
    if (value !== undefined && !Number.isFinite(value)) throw new Error(`${name} must be finite`);
  }
  for (const [name, value] of Object.entries({ wire: d, meanDiameter: D, turns: N, modulus: E })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero`);
  }
  if (D <= d) throw new Error('mean diameter must be greater than wire diameter');
  if (allow !== undefined && allow <= 0) throw new Error('allow must be greater than zero');
  if (moment !== undefined && angle !== undefined) throw new Error('provide only one of --moment or --angle');
  const index = D / d;
  const innerFibreFactor = (4 * index ** 2 - index - 1) / (4 * index * (index - 1));
  const rateRad = E * d ** 4 / (64 * D * N);
  const rateDeg = rateRad * Math.PI / 180;
  const rateTurn = rateRad * 2 * Math.PI;
  const base = { rateRad, rateDeg, rateTurn, index, innerFibreFactor };
  if (Object.values(base).some(value => !Number.isFinite(value) || value <= 0)) {
    throw new Error('inputs exceed the supported numeric range');
  }
  if (moment === undefined && angle === undefined) return base;
  const M = moment ?? rateDeg * angle!;
  const angleRad = M / rateRad;
  const angleDeg = angle ?? angleRad * 180 / Math.PI;
  const stress = innerFibreFactor * 32 * Math.abs(M) / (Math.PI * d ** 3);
  const woundTurns = N + angleRad / (2 * Math.PI);
  if (woundTurns <= 0) throw new Error('load produces a nonpositive wound turn count');
  const woundMeanDiameter = D * N / woundTurns;
  const innerDiameter = woundMeanDiameter - d;
  const loaded = { ...base, moment: M, angleRad, angleDeg, stress, woundMeanDiameter, innerDiameter };
  if (Object.values(loaded).some(value => !Number.isFinite(value))) throw new Error('inputs exceed the supported numeric range');
  // Zero stress has an infinite safety factor; null makes this explicit in JSON.
  const safetyFactor = allow === undefined ? undefined : stress === 0 ? null : allow / stress;
  if (safetyFactor !== undefined && safetyFactor !== null && !Number.isFinite(safetyFactor)) {
    throw new Error('safety factor exceeds the supported numeric range');
  }
  return { ...loaded, ...(allow === undefined ? {} : { safetyFactor }) };
}
