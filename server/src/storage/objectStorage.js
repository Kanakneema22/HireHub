const { createHash, createHmac } = require("node:crypto");

const requiredEnv = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];

function storageConfig() {
  const present = requiredEnv.filter((key) => Boolean(process.env[key]));
  if (present.length === 0) return null;
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) throw new Error("Object storage configuration is incomplete: " + missing.join(", "));
  const endpoint = new URL(process.env.S3_ENDPOINT);
  if (!/^https?:$/.test(endpoint.protocol)) throw new Error("S3_ENDPOINT must use HTTP or HTTPS.");
  return {
    endpoint,
    bucket: process.env.S3_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY_ID,
    secretKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || "auto",
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function awsEncodePath(value) {
  return value.split("/").map((part) => encodeURIComponent(part).replace(/[!*'()]/g, (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase())).join("/");
}

function signedHeaders(config, method, objectKey, body, contentType) {
  const url = new URL(config.endpoint);
  const endpointPath = url.pathname.replace(/\/$/, "");
  url.pathname = endpointPath + "/" + awsEncodePath(config.bucket + "/" + objectKey);
  const payloadHash = sha256(body || Buffer.alloc(0));
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = timestamp.slice(0, 8);
  const host = url.host;
  const normalizedType = contentType || "application/octet-stream";
  const canonicalHeaders = "content-type:" + normalizedType + "\n" +
    "host:" + host + "\n" +
    "x-amz-content-sha256:" + payloadHash + "\n" +
    "x-amz-date:" + timestamp + "\n";
  const signedHeaderNames = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = method + "\n" + url.pathname + "\n\n" + canonicalHeaders + "\n" + signedHeaderNames + "\n" + payloadHash;
  const scope = date + "/" + config.region + "/s3/aws4_request";
  const stringToSign = "AWS4-HMAC-SHA256\n" + timestamp + "\n" + scope + "\n" + sha256(canonicalRequest);
  const dateKey = hmac("AWS4" + config.secretKey, date);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");
  return {
    url,
    headers: {
      "Content-Type": normalizedType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": timestamp,
      Authorization: "AWS4-HMAC-SHA256 Credential=" + config.accessKey + "/" + scope + ", SignedHeaders=" + signedHeaderNames + ", Signature=" + signature,
    },
  };
}

async function requestObject(method, key, body = Buffer.alloc(0), contentType) {
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/(photo|resume)-[a-f0-9-]+$/.test(key)) {
    throw new Error("Invalid private object key.");
  }
  const config = storageConfig();
  if (!config) throw new Error("Object storage is not configured.");
  const signed = signedHeaders(config, method, key, body, contentType);
  const response = await fetch(signed.url, {
    method,
    headers: signed.headers,
    body: method === "GET" || method === "DELETE" ? undefined : body,
  });
  if (!response.ok) {
    const detail = method === "GET" && response.status === 404 ? "Object not found." : "Object storage returned HTTP " + response.status + ".";
    throw new Error(detail);
  }
  if (method === "GET") return Buffer.from(await response.arrayBuffer());
}

function isObjectStorageConfigured() {
  return Boolean(storageConfig());
}

async function putObject(key, body, contentType) {
  await requestObject("PUT", key, body, contentType);
}

async function getObject(key) {
  return requestObject("GET", key);
}

async function deleteObject(key) {
  if (key) await requestObject("DELETE", key);
}

module.exports = { deleteObject, getObject, isObjectStorageConfigured, putObject };
