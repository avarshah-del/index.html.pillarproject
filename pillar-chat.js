const CHAT_ENDPOINT = "https://brain-hq-bot.avarshah.workers.dev";
let guideChatHistory = [];

function setChatLauncher(visible) {
    const btn = document.getElementById("pillar-chat-btn");
    if (btn) btn.style.display = visible ? "block" : "none";
}

function toggleChat() {
    const win = document.getElementById("pillar-chat-window");
    const opening = win.style.display === "none" || win.style.display === "";
    win.style.display = opening ? "flex" : "none";
    setChatLauncher(!opening);
    if (opening) document.getElementById("pillar-chat-input").focus();
}

function openMicrogliaChat() {
    const win = document.getElementById("pillar-chat-window");
    win.style.display = "flex";
    setChatLauncher(false);
    document.getElementById("pillar-chat-input").focus();
}

function appendGuideMsg(text, isUser) {
    const body = document.getElementById("pillar-chat-body");
    const div = document.createElement("div");
    div.className = isUser
        ? "bg-stone-900 text-white p-3 rounded-lg self-end max-w-[85%]"
        : "bg-white border border-stone-200 text-stone-800 p-3 rounded-lg self-start max-w-[88%]";
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
}

async function sendGuideQuestion() {
    const input = document.getElementById("pillar-chat-input");
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    appendGuideMsg(message, true);
    const loading = appendGuideMsg("Checking Brain HQ Glossary...", false);
    const activePage = (document.getElementById("pillar-chat-btn") || {}).dataset.page || "The Pillar Project";

    try {
        const res = await fetch(CHAT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userMessage: message,
                history: guideChatHistory.slice(-6),
                activePage: activePage
            })
        });
        const data = await res.json();
        loading.remove();
        const reply = data.reply || "Could you try asking that one more time?";
        appendGuideMsg(reply, false);
        guideChatHistory.push({ role: "user", content: message }, { role: "assistant", content: reply });
    } catch (err) {
        loading.remove();
        appendGuideMsg("Connection is offline right now—please try again shortly.", false);
    }
}
