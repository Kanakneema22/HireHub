const test = require("node:test");
const assert = require("node:assert/strict");
const { deleteObject, getObject, putObject } = require("../src/storage/objectStorage");

test("private S3-compatible storage signs and round-trips files", async (t) => {
  const envKeys = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_REGION"];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const objects = new Map();
  const requests = [];
  process.env.S3_ENDPOINT = "https://objects.example.test";
  process.env.S3_BUCKET = "hirehub-private-test";
  process.env.S3_ACCESS_KEY_ID = "test-access-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.S3_REGION = "auto";
  global.fetch = async (url, options) => {
    const objectPath = new URL(url).pathname;
    requests.push({ method: options.method, url: objectPath, authorization: options.headers.Authorization, body: options.body });
    if (options.method === "PUT") objects.set(objectPath, Buffer.from(options.body));
    if (options.method === "GET") {
      if (!objects.has(objectPath)) return new Response(null, { status: 404 });
      return new Response(objects.get(objectPath), { status: 200, headers: { "Content-Type": "application/pdf" } });
    }
    if (options.method === "DELETE") objects.delete(objectPath);
    return new Response(null, { status: options.method === "PUT" ? 200 : 204 });
  };
  t.after(() => {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  const key = "profiles/0123456789abcdef01234567/resume-123abc";
  const input = Buffer.from("private resume test bytes");
  await putObject(key, input, "application/pdf");
  assert.deepEqual(await getObject(key), input);
  await deleteObject(key);
  assert.equal(objects.size, 0);
  assert.equal(requests.length, 3);
  assert.ok(requests.every((request) => request.authorization?.startsWith("AWS4-HMAC-SHA256 Credential=test-access-key/")));
  assert.ok(requests.every((request) => request.url.startsWith("/hirehub-private-test/profiles/")));
});

test("private storage rejects arbitrary object paths", async () => {
  await assert.rejects(() => getObject("../../secrets"), /Invalid private object key/);
});
