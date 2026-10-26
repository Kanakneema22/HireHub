const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const TOKEN_COOKIE = "hirehub_token";
const TOKEN_AGE_SECONDS = 7 * 24 * 60 * 60;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in server/.env");
  }
  return secret;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, hashHex] = (storedHash || "").split(":");
  if (!salt || !/^[a-f0-9]{128}$/i.test(hashHex || "")) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function createToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), iat: now, exp: now + TOKEN_AGE_SECONDS })).toString("base64url");
  const input = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", getJwtSecret()).update(input).digest("base64url");
  return `${input}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
  if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("Invalid token");
  const input = `${headerPart}.${payloadPart}`;
  const expected = crypto.createHmac("sha256", getJwtSecret()).update(input).digest();
  const received = Buffer.from(signaturePart, "base64url");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new Error("Invalid token");
  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) throw new Error("Expired token");
  return payload;
}

function getTokenFromRequest(req) {
  const authorization = req.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = (req.get("cookie") || "").split(";").map((item) => item.trim())
    .find((item) => item.startsWith(`${TOKEN_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(TOKEN_COOKIE.length + 1)) : "";
}

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";
  const sameSite = isProduction ? "None" : "Lax";
  res.setHeader("Set-Cookie", `${TOKEN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${TOKEN_AGE_SECONDS}${secure}`);
}

function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";
  const sameSite = isProduction ? "None" : "Lax";
  res.setHeader("Set-Cookie", `${TOKEN_COOKIE}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`);
}

module.exports = { clearAuthCookie, createToken, getJwtSecret, getTokenFromRequest, hashPassword, setAuthCookie, verifyPassword, verifyToken };



