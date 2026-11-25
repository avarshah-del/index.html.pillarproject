// The only Hall of Fame address. Deploy workers/hall-of-fame, then this URL starts returning names.
const HALL_OF_FAME_URL = "https://hall-of-fame.avarshah.workers.dev";

function hallStatus(text) {
    const p = document.createElement("p");
    p.className = "hof-status";
    p.textContent = text;
    return p;
}

function paintHallOfFame(el, entries, highlight) {
    el.replaceChildren();
    const clean = Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry.codename === "string") : [];
    if (!clean.length) {
        el.appendChild(hallStatus("No Master Agents on the board yet."));
        return;
    }
    const list = document.createElement("ul");
    list.className = "hof-board";
    const highlightName = (highlight || "").toUpperCase();
    clean.forEach((entry) => {
        const item = document.createElement("li");
        item.className = "hof-row";
        const name = document.createElement("span");
        name.className = "hof-name";
        name.textContent = entry.codename;
        const meta = document.createElement("span");
        meta.className = "hof-meta";
        let when = "";
        if (entry.earnedAt) {
            const date = new Date(entry.earnedAt);
            if (!Number.isNaN(date.getTime())) {
                when = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
            }
        }
        if (highlightName && entry.codename.toUpperCase() === highlightName) {
            item.classList.add("is-you");
            meta.textContent = when ? "You · " + when : "You";
        } else {
            meta.textContent = when;
        }
        item.append(name, meta);
        list.appendChild(item);
    });
    el.appendChild(list);
}

function loadHallOfFame(elementId, options) {
    const el = document.getElementById(elementId);
    if (!el) return Promise.resolve();
    const settings = options || {};
    el.replaceChildren(hallStatus("Hall of Fame loading…"));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    return fetch(HALL_OF_FAME_URL, { method: "GET", cache: "no-store", signal: controller.signal })
        .then((res) => {
            if (!res.ok) throw new Error("bad status");
            return res.json();
        })
        .then((data) => {
            paintHallOfFame(el, data && data.entries, settings.highlight);
        })
        .catch(() => {
            el.replaceChildren(hallStatus("The Hall of Fame can't be reached right now. Everything else on this page still works. Please try again in a little bit."));
        })
        .finally(() => clearTimeout(timer));
}

function submitHallOfFameCodename(codename) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    return fetch(HALL_OF_FAME_URL, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codename: codename })
    }).then((res) => res.json().catch(() => ({})).then((data) => {
        if (!res.ok) {
            const error = new Error((data && data.error) || "Hall of Fame request failed");
            error.status = res.status;
            error.code = (data && data.error) || "request_failed";
            throw error;
        }
        return data || {};
    })).finally(() => clearTimeout(timer));
}
