import { randomBytes } from 'node:crypto';

const argument = process.argv[2];
const seed = argument === undefined ? randomBytes(4).readUInt32LE() : Number(argument);
if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
  throw new Error('Provide an unsigned 32-bit integer seed.');
}
let state = seed;
const random = () => {
  state = (Math.imul(1664525, state) + 1013904223) >>> 0;
  return state / 4294967296;
};
const pick = (choices) => choices[Math.floor(random() * choices.length)];
console.log(JSON.stringify({
  seed,
  palette: pick(['cobalt and acid yellow', 'signal orange and graphite', 'ultraviolet and mint', 'deep teal and electric lime']),
  composition: pick(['engineering field notes', 'oversized typographic poster', 'robotics control room', 'exhibition placard']),
  accent: pick(['technical crosshairs', 'calibration ticks', 'coordinate grid', 'numbered rules']),
}, null, 2));
