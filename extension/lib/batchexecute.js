/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.batchexecute = {
  stripPrefix(text) {
    const trimmed = String(text).trim();
    if (trimmed.startsWith(")]}'")) {
      const nl = trimmed.indexOf("\n");
      return nl >= 0 ? trimmed.slice(nl + 1) : "";
    }
    return trimmed;
  },

  parseFrames(text) {
    const body = this.stripPrefix(text);
    const frames = [];
    let pos = 0;

    while (pos < body.length) {
      const nl = body.indexOf("\n", pos);
      if (nl < 0) break;
      const len = parseInt(body.slice(pos, nl), 10);
      if (!Number.isFinite(len)) break;
      const start = nl + 1;
      const chunk = body.slice(start, start + len);
      frames.push(chunk);
      pos = start + len;
    }

    return frames;
  },

  parseResponse(text) {
    const frames = this.parseFrames(text);
    const results = [];

    for (const frame of frames) {
      try {
        const outer = JSON.parse(frame);
        if (!Array.isArray(outer)) continue;
        for (const part of outer) {
          if (!Array.isArray(part) || part.length < 3) continue;
          const rpcId = part[0];
          const innerRaw = part[2];
          if (typeof innerRaw === "string") {
            try {
              results.push({ rpcId, data: JSON.parse(innerRaw) });
            } catch {
              results.push({ rpcId, data: innerRaw });
            }
          } else if (innerRaw != null) {
            results.push({ rpcId, data: innerRaw });
          }
        }
      } catch {
        // skip malformed frame
      }
    }

    return results;
  },

  extractTokensFromHtml(html) {
    const pick = (patterns) => {
      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) return m[1];
      }
      return null;
    };

    const tokens = {
      at: pick([/"SNlM0e":"([^"]+)"/, /SNlM0e['"]\s*,\s*['"]([^'"]+)/]),
      bl: pick([/"cfb2h":"([^"]+)"/, /"bl":"([^"]+)"/]),
      sid: pick([/"FdrFJe":"([^"]+)"/, /"f\.sid":"([^"]+)"/]),
    };

    const wiz =
      typeof window !== "undefined" ? window.WIZ_global_data : null;
    if (wiz && typeof wiz === "object") {
      if (wiz.SNlM0e) tokens.at = String(wiz.SNlM0e);
      if (wiz.cfb2h) tokens.bl = String(wiz.cfb2h);
      if (wiz.FdrFJe) tokens.sid = String(wiz.FdrFJe);
    }

    return tokens;
  },

  async fetchTokens() {
    if (this._tokens?.at) return this._tokens;

    const html = document.documentElement?.innerHTML || "";
    let tokens = this.extractTokensFromHtml(html);

    if (!tokens.at) {
      const resp = await fetch("/app", { credentials: "include" });
      const pageHtml = await resp.text();
      tokens = this.extractTokensFromHtml(pageHtml);
    }

    if (!tokens.at) {
      throw new Error(
        "Could not read Gemini session tokens. Refresh gemini.google.com and try again."
      );
    }

    this._tokens = tokens;
    this._tokensAt = Date.now();
    return tokens;
  },

  async call(rpcId, payload, tokens = null, retried = false) {
    if (this._tokensAt && Date.now() - this._tokensAt > 30 * 60 * 1000) {
      this._tokens = null;
    }
    const tok = tokens || (await this.fetchTokens());
    const reqId = Math.floor(Math.random() * 900000) + 100000;
    const payloadStr = JSON.stringify(payload);
    const fReq = JSON.stringify([[ [rpcId, payloadStr, null, "generic"] ]]);

    const params = new URLSearchParams({
      rpcids: rpcId,
      "source-path": "/app",
      bl: tok.bl || "",
      "f.sid": tok.sid || "",
      hl: "en",
      _reqid: String(reqId),
      rt: "c",
    });

    const resp = await fetch(
      `/_/BardChatUi/data/batchexecute?${params.toString()}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-Same-Domain": "1",
        },
        body: `f.req=${encodeURIComponent(fReq)}&at=${encodeURIComponent(tok.at)}`,
      }
    );

    if (!resp.ok) {
      if (resp.status === 400 && !retried) {
        this._tokens = null;
        return this.call(rpcId, payload, await this.fetchTokens(), true);
      }
      throw new Error(`Gemini API HTTP ${resp.status}`);
    }

    const text = await resp.text();
    const parsed = this.parseResponse(text);
    const match = parsed.find((p) => p.rpcId === rpcId);
    if (!match) {
      throw new Error(`No data in Gemini response for ${rpcId}`);
    }
    return match.data;
  },
};
