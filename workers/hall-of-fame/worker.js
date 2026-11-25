// Brain HQ Hall of Fame.
// Stores codenames only. No real names, emails, ages, or points.
// Newest Master Agent first.

const BOARD_KEY = "board";
const MAX_ENTRIES = 200;
const MIN_CODENAME = 2;
const MAX_CODENAME = 15;
const MAX_BODY_BYTES = 800;
const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 600;
const PROD_ORIGIN = "https://pillarproject.online";

// Strong words are matched inside the codename after spaces and symbols are removed.
// Short words are matched only when the whole codename is that word, so names like CLASS still pass.
const STRONG_WORDS = [
    "fuck", "shit", "bitch", "asshole", "bastard", "cunt",
    "nigger", "nigga", "nigg", "faggot", "retard", "slut",
    "whore", "porn", "piss"
];
const EXACT_WORDS = ["ass", "sex", "cum", "tit", "tits", "cock", "damn", "hell", "kys", "dick"];

export function isAllowedOrigin(origin) {
    if (!origin || typeof origin !== "string") return false;
    if (origin === PROD_ORIGIN) return true;
    let url;
    try {
        url = new URL(origin);
    } catch (err) {
        return false;
    }
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const web = url.protocol === "http:" || url.protocol === "https:";
    return local && web;
}

export function normalizeCodename(raw) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim().replace(/\s+/g, " ").toUpperCase();
    if (trimmed.length < MIN_CODENAME || trimmed.length > MAX_CODENAME) return null;
    if (!/^[A-Z0-9]+(?:[ .'-]+[A-Z0-9]+)*$/.test(trimmed)) return null;
    return trimmed;
}

export function flattenCodename(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/0/g, "o")
        .replace(/1/g, "i")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/5/g, "s")
        .replace(/7/g, "t");
}

export function isBlockedCodename(name) {
    const flat = flattenCodename(name);
    if (!flat) return true;
    if (EXACT_WORDS.includes(flat)) return true;
    return STRONG_WORDS.some((word) => flat.includes(word));
}

function clientIp(request) {
    return request.headers.get("CF-Connecting-IP")
        || (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim()
        || "unknown";
}

function withCors(headers, origin) {
    if (origin && isAllowedOrigin(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Vary"] = "Origin";
    }
    return headers;
}

function json(data, status, origin, cache) {
    const headers = withCors({
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": cache || "no-store"
    }, origin);
    return new Response(JSON.stringify(data), { status, headers });
}

async function readBoard(env) {
    const raw = await env.HALL.get(BOARD_KEY);
    if (!raw) return [];
    try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data.filter((entry) => entry && typeof entry.codename === "string" && typeof entry.earnedAt === "string");
    } catch (err) {
        return [];
    }
}

function sortNewest(board) {
    return board.slice().sort((a, b) => {
        if (a.earnedAt === b.earnedAt) return 0;
        return a.earnedAt < b.earnedAt ? 1 : -1;
    });
}

async function tooManyPosts(env, ip) {
    const key = `rl:${ip}`;
    const current = Number.parseInt(await env.HALL.get(key) || "0", 10) || 0;
    if (current >= RATE_LIMIT) return true;
    await env.HALL.put(key, String(current + 1), { expirationTtl: RATE_WINDOW_SECONDS });
    return false;
}

export async function handleRequest(request, env) {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
        if (!isAllowedOrigin(origin)) {
            return new Response(null, { status: 403 });
        }
        const headers = withCors({
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        }, origin);
        return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET") {
        if (origin && !isAllowedOrigin(origin)) {
            return json({ error: "origin_not_allowed" }, 403, null);
        }
        const entries = sortNewest(await readBoard(env));
        return json({ entries }, 200, origin, "public, max-age=15");
    }

    if (request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, origin);
    }

    if (!isAllowedOrigin(origin)) {
        return json({ error: "origin_not_allowed" }, 403, null);
    }

    if (await tooManyPosts(env, clientIp(request))) {
        return json({ error: "rate_limited" }, 429, origin);
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "bad_json" }, 400, origin);
    }

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
        return json({ error: "payload_too_large" }, 400, origin);
    }

    let body;
    try {
        body = JSON.parse(text);
    } catch (err) {
        return json({ error: "bad_json" }, 400, origin);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return json({ error: "bad_json" }, 400, origin);
    }

    const codename = normalizeCodename(body.codename);
    if (!codename) {
        return json({ error: "invalid_codename" }, 400, origin);
    }
    if (isBlockedCodename(codename)) {
        return json({ error: "codename_not_allowed" }, 400, origin);
    }

    const board = await readBoard(env);
    const existing = board.find((entry) => entry.codename === codename);
    if (existing) {
        return json({ ok: true, alreadyListed: true, entry: existing }, 200, origin);
    }

    const entry = { codename, earnedAt: new Date().toISOString() };
    const next = sortNewest([entry, ...board]).slice(0, MAX_ENTRIES);
    await env.HALL.put(BOARD_KEY, JSON.stringify(next));
    return json({ ok: true, alreadyListed: false, entry }, 201, origin);
}

export default {
    fetch(request, env) {
        return handleRequest(request, env);
    }
};
