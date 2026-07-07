import crypto from "node:crypto";

const WORDS = [
  "Cobalt", "Falcon", "Marble", "Cedar", "Otter", "Ember", "Quartz", "Vertex",
  "Nimbus", "Onyx", "Cipher", "Harbor", "Pixel", "Comet", "Lumen", "Raven",
  "Talon", "Zenith", "Basalt", "Orbit", "Delta", "Cinder", "Willow", "Cobra",
];
const SYMBOLS = "!@#$%&*?";

const pick = (arr) => arr[crypto.randomInt(arr.length)];

/** Strong but typeable: Word-Word-####-<symbol> (upper+lower+digit+symbol). */
export function genStrongPassword() {
  const w1 = pick(WORDS);
  let w2 = pick(WORDS);
  while (w2 === w1) w2 = pick(WORDS);
  const digits = String(crypto.randomInt(1000, 9999));
  const sym = pick(SYMBOLS.split(""));
  return `${w1}-${w2}-${digits}${sym}`;
}

/** Enforce: ≥10 chars with lower, upper, digit and symbol. */
export function isStrongPassword(pw = "") {
  return (
    pw.length >= 10 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}
