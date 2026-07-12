export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs, maxMs) {
  const ms = minMs + Math.random() * Math.max(0, maxMs - minMs);
  return sleep(ms);
}

export class TokenExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = "TokenExpiredError";
  }
}
