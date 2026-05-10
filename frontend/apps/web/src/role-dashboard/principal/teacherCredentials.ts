const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateOneTimePassword(): string {
  let body = "";
  for (let i = 0; i < 14; i++) {
    body += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return `Ots${body}!`;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}
