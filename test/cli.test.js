import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculate } from '../dist/spring.js';
const base = ['--wire', '2', '--mean-dia', '20', '--turns', '10'];
const run = (...args) => {
  const dir = mkdtempSync(join(tmpdir(), 'torsion-test-'));
  const out = join(dir, 'stdout');
  const err = join(dir, 'stderr');
  const descriptors = [openSync(out, 'w'), openSync(err, 'w')];
  try {
    // File descriptors also work in sandboxes that restrict child-process pipes.
    const result = spawnSync(process.execPath, ['dist/cli.js', ...args], {
      stdio: ['ignore', ...descriptors],
    });
    if (result.error) throw result.error;
    return { status: result.status, stdout: readFileSync(out, 'utf8'), stderr: readFileSync(err, 'utf8') };
  } finally {
    descriptors.forEach(closeSync);
    rmSync(dir, { recursive: true, force: true });
  }
};
const close = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('reference rates and geometry', () => {
  const p = run(...base, '--json');
  assert.equal(p.status, 0);
  assert.equal(p.stderr, '');
  const r = JSON.parse(p.stdout);
  close(r.rateRad, 250, 1e-10);
  close(r.rateDeg, 4.3633, 0.00005);
  close(r.rateTurn, 250 * 2 * Math.PI, 1e-10);
  assert.equal(r.index, 10);
  close(r.innerFibreFactor, 1.0806, 0.00005);
  assert.equal(r.moment, undefined);
});
test('reference moment, stress, wound diameter and safety factor', () => {
  const p = run(...base, '--moment', '500', '--allow', '1000', '--json');
  assert.equal(p.status, 0);
  const r = JSON.parse(p.stdout);
  close(r.angleRad, 2, 1e-10);
  close(r.angleDeg, 114.59, 0.005);
  close(r.stress, 687.9, 0.05);
  close(r.woundMeanDiameter, 19.383, 0.0005);
  close(r.innerDiameter, r.woundMeanDiameter - 2, 1e-10);
  close(r.safetyFactor, 1.454, 0.0005);
});
test('angle gives reference moment and modulus scales rate', () => {
  const p = run(...base, '--angle', '90', '--json');
  assert.equal(p.status, 0);
  close(JSON.parse(p.stdout).moment, 392.70, 0.005);
  assert.equal(calculate({ wire: 2, meanDiameter: 20, turns: 10, modulus: 100000 }).rateRad, 125);
});
test('default output is a formatted table', () => {
  const p = run(...base, '--moment', '500', '--allow', '1000');
  assert.equal(p.status, 0);
  for (const text of ['Quantity', '250.00', '4.3633', '1.0806', '114.59', '687.9', '19.383', '1.454']) assert.ok(p.stdout.includes(text));
});
test('invalid arguments exit 1 with stderr only', () => {
  for (const args of [
    [], ['--wire', '20', '--mean-dia', '20', '--turns', '10'],
    [...base, '--turns', '0'], ['--wire', '2', '--mean-dia', '20', '--turns', '0'],
    [...base, '--moment', '1', '--angle', '2'], [...base, '--wire', '3'],
    [...base, '--modulus', '0'], [...base, '--allow', '-1'],
    [...base, '--moment', 'NaN'], [...base, '--angle', 'Infinity'],
    [...base, '--moment', '1e999'], [...base, '--moment'],
    [...base, '--unknown'], [...base, '--moment', ''],
    ['--wire', '-2', '--mean-dia', '20', '--turns', '10'],
    [...base, '--angle', '-4000'],
  ]) {
    const p = run(...args);
    assert.equal(p.status, 1, JSON.stringify(args));
    assert.match(p.stderr, /Error:/);
    assert.equal(p.stdout, '');
  }
});
test('index warnings preserve successful JSON output and respect boundaries', () => {
  for (const D of [6, 8, 32, 34]) {
    const p = run('--wire', '2', '--mean-dia', String(D), '--turns', '10', '--json');
    assert.equal(p.status, 0);
    assert.equal(JSON.parse(p.stdout).index, D / 2);
    assert.equal(p.stderr.includes('Warning:'), D < 8 || D > 32);
  }
});
test('zero load and negative load have meaningful stress and safety factors', () => {
  const zero = JSON.parse(run(...base, '--moment', '0', '--allow', '1000', '--json').stdout);
  assert.equal(zero.stress, 0);
  assert.equal(zero.safetyFactor, null);
  const negative = JSON.parse(run(...base, '--moment', '-500', '--json').stdout);
  assert.ok(negative.stress > 0);
  assert.ok(negative.woundMeanDiameter > 20);
});
test('help requires no inputs', () => {
  const p = run('--help');
  assert.equal(p.status, 0);
  assert.match(p.stdout, /Usage:/);
  assert.equal(p.stderr, '');
});
