import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest, isAllowedOrigin, isBlockedCodename, normalizeCodename } from "./worker.js";

function memoryKv() {
    const store = new Map();
    return {
        async get(key) {
            return store.has(key) ? store.get(key) : null;
        },
        async put(key, value) {
            store.set(key, String(value));
        }
    };
}

function post(codename, origin, ip, extra) {
    return new Request("https://hall-of-fame.avarshah.workers.dev/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Origin": origin,
            "CF-Connecting-IP": ip
        },
        body: JSON.stringify(Object.assign({ codename }, extra || {}))
    });
}

test("origin allow list is the live site plus localhost", () => {
    assert.equal(isAllowedOrigin("https://pillarproject.online"), true);
    assert.equal(isAllowedOrigin("http://localhost:8080"), true);
    assert.equal(isAllowedOrigin("http://127.0.0.1:8787"), true);
    assert.equal(isAllowedOrigin("https://localhost:3000"), true);
    assert.equal(isAllowedOrigin("https://evil.example"), false);
    assert.equal(isAllowedOrigin("https://pillarproject.online.evil.com"), false);
    assert.equal(isAllowedOrigin("http://localhost.evil.com"), false);
    assert.equal(isAllowedOrigin(""), false);
});

test("codenames are short, plain, and uppercase", () => {
    assert.equal(normalizeCodename("  nova  "), "NOVA");
    assert.equal(normalizeCodename("dr. no"), "DR. NO");
    assert.equal(normalizeCodename("agent-7"), "AGENT-7");
    assert.equal(normalizeCodename("a"), null);
    assert.equal(normalizeCodename("thisnameiswaytoolong"), null);
    assert.equal(normalizeCodename("<script>"), null);
    assert.equal(normalizeCodename("NOVA!"), null);
});

test("blocked names are caught without blocking ordinary words", () => {
    assert.equal(isBlockedCodename("CLASS"), false);
    assert.equal(isBlockedCodename("HELLO"), false);
    assert.equal(isBlockedCodename("DICKENS"), false);
    assert.equal(isBlockedCodename("FUCK"), true);
    assert.equal(isBlockedCodename("F-U-C-K"), true);
    assert.equal(isBlockedCodename("ASS"), true);
});

test("post and get round trip, newest first, no extra fields stored", async () => {
    const env = { HALL: memoryKv() };
    const origin = "http://localhost:8080";
    const first = await handleRequest(post("nova", origin, "10.0.0.1", { points: 99999, email: "a@b.c" }), env);
    assert.equal(first.status, 201);
    const created = await first.json();
    assert.equal(created.entry.codename, "NOVA");
    assert.equal(created.entry.points, undefined);
    assert.equal(created.alreadyListed, false);

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await handleRequest(post("spark", origin, "10.0.0.2"), env);
    assert.equal(second.status, 201);

    const listed = await handleRequest(new Request("https://hall-of-fame.avarshah.workers.dev/", {
        headers: { Origin: origin }
    }), env);
    assert.equal(listed.status, 200);
    assert.equal(listed.headers.get("Access-Control-Allow-Origin"), origin);
    const body = await listed.json();
    assert.deepEqual(body.entries.map((entry) => entry.codename), ["SPARK", "NOVA"]);
    assert.equal(JSON.stringify(body).includes("10.0.0"), false);
    assert.equal(JSON.stringify(body).includes("99999"), false);
});

test("the same codename is not added twice", async () => {
    const env = { HALL: memoryKv() };
    const origin = "https://pillarproject.online";
    await handleRequest(post("Lumen", origin, "10.0.0.3"), env);
    const again = await handleRequest(post("lumen", origin, "10.0.0.4"), env);
    assert.equal(again.status, 200);
    const body = await again.json();
    assert.equal(body.alreadyListed, true);
    const listed = await handleRequest(new Request("https://hall-of-fame.avarshah.workers.dev/"), env);
    const board = await listed.json();
    assert.equal(board.entries.length, 1);
});

test("rejected posts", async () => {
    const env = { HALL: memoryKv() };
    const origin = "http://127.0.0.1:5500";
    const evil = await handleRequest(post("NOVA", "https://evil.example", "10.1.0.1"), env);
    assert.equal(evil.status, 403);
    assert.equal(evil.headers.get("Access-Control-Allow-Origin"), null);

    const profane = await handleRequest(post("fuck", origin, "10.1.0.2"), env);
    assert.equal(profane.status, 400);
    assert.equal((await profane.json()).error, "codename_not_allowed");

    const junk = await handleRequest(post("!!!", origin, "10.1.0.3"), env);
    assert.equal((await junk.json()).error, "invalid_codename");

    const missingOrigin = await handleRequest(new Request("https://hall-of-fame.avarshah.workers.dev/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "10.1.0.4" },
        body: JSON.stringify({ codename: "NOVA" })
    }), env);
    assert.equal(missingOrigin.status, 403);

    const board = await (await handleRequest(new Request("https://hall-of-fame.avarshah.workers.dev/"), env)).json();
    assert.equal(board.entries.length, 0);
});

test("rate limit is per IP", async () => {
    const env = { HALL: memoryKv() };
    const origin = "http://localhost:8080";
    for (let i = 0; i < 20; i++) {
        const res = await handleRequest(post("ok" + i, origin, "10.9.9.9"), env);
        assert.ok(res.status === 201 || res.status === 200);
    }
    const blocked = await handleRequest(post("later", origin, "10.9.9.9"), env);
    assert.equal(blocked.status, 429);
    const other = await handleRequest(post("other", origin, "10.9.9.10"), env);
    assert.equal(other.status, 201);
});

test("preflight allows the site and blocks everyone else", async () => {
    const env = { HALL: memoryKv() };
    const ok = await handleRequest(new Request("https://hall-of-fame.avarshah.workers.dev/", {
        method: "OPTIONS",
        headers: { Origin: "https://pillarproject.online" }
    }), env);
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get("Access-Control-Allow-Origin"), "https://pillarproject.online");
    const no = await handleRequest(new Request("https://hall-of-fame.avarshah.workers.dev/", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" }
    }), env);
    assert.equal(no.status, 403);
});
