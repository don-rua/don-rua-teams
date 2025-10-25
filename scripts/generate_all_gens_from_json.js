const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TEAMS_DIR = path.join(ROOT, "teams");
const OUT_DIR = path.join(ROOT, "public");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// THEME
const THEME = {
  fontFamily:
    "'JetBrainsMono Nerd Font', 'Symbols Nerd Font', 'JetBrains Mono', Inter, Roboto, 'Segoe UI', Helvetica, Arial, monospace, 'Apple Color Emoji', 'Segoe UI Emoji'",
  pageBg: "#0b1220",
  titleColor: "#e5e7eb",
  cardBg: "#0f172a",
  cardStroke: "#1f2940",
  nameColor: "#e5e7eb",
};

// LAYOUT
const LAYOUT = {
  AVATAR: 80,
  GAP: 24,
  CARD_W: 260,
  CARD_H: 160,
  COLS: 3,
  PAD_X: 24,
  PAD_Y: 24,
  TITLE_GAP: 16,
  COHORT_GAP_Y: 32,
};

const token = process.env.GITHUB_TOKEN;
const headers = {
  "User-Agent": "don-rua-teams-grid",
  Accept: "application/vnd.github+json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

function escapeXml(s) {
  return (s || "").replace(
    /[<>&'"]/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[
        c
      ])
  );
}
function fontAttr() {
  return `'${THEME.fontFamily.replace(/'/g, "&apos;")}'`;
}

async function imageToBase64(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}

async function ghUser(handle) {
  const url = `https://api.github.com/users/${encodeURIComponent(handle)}`;
  const res = await fetch(url, { headers });
  if (res.status === 404)
    throw new Error(`GitHub handle not found: "${handle}"`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GitHub API error for "${handle}": ${res.status} ${res.statusText} — ${body}`
    );
  }
  const j = await res.json();

  const avatarUrl = `https://github.com/${encodeURIComponent(
    handle
  )}.png?size=${LAYOUT.AVATAR * 2}`;
  const avatarBase64 = await imageToBase64(avatarUrl);

  return {
    handle,
    name: j.name && j.name.trim() ? j.name.trim() : handle,
    avatar: avatarBase64,
  };
}

function cohortTitle(label) {
  if (label === "DEV-GEN-0" || label === "FOUNDERS")
    return "Dev Gen 0 — First build team";
  return label;
}

function card(x, y, user, clipId) {
  const { CARD_W, CARD_H, AVATAR } = LAYOUT;
  const avatarX = (CARD_W - AVATAR) / 2;
  const avatarY = 18;
  const nameY = avatarY + AVATAR + 30;
  return [
    `<g transform="translate(${x}, ${y})">`,
    `  <defs>`,
    `    <clipPath id="${clipId}">`,
    `      <circle cx="${avatarX + AVATAR / 2}" cy="${
      avatarY + AVATAR / 2
    }" r="${AVATAR / 2}" />`,
    `    </clipPath>`,
    `  </defs>`,
    `  <a xlink:href="https://github.com/${escapeXml(
      user.handle
    )}" target="_blank">`,
    `    <rect rx="14" ry="14" x="0" y="0" width="${CARD_W}" height="${CARD_H}" fill="${THEME.cardBg}" stroke="${THEME.cardStroke}" stroke-width="1" />`,
    `    <image x="${avatarX}" y="${avatarY}" href="${escapeXml(
      user.avatar
    )}" width="${AVATAR}" height="${AVATAR}" clip-path="url(#${clipId})" />`,
    `    <text x="${
      CARD_W / 2
    }" y="${nameY}" text-anchor="middle" font-family=${fontAttr()} font-size="14" fill="${
      THEME.nameColor
    }">${escapeXml(user.displayName)}</text>`,
    `  </a>`,
    `</g>`,
  ].join("\n");
}

function layoutCohort(label, users, yOffset) {
  const { COLS, CARD_W, CARD_H, GAP, PAD_X, TITLE_GAP } = LAYOUT;
  const rows = Math.ceil(users.length / COLS);
  const width = PAD_X * 2 + COLS * CARD_W + (COLS - 1) * GAP;
  const titleH = 28 + TITLE_GAP;
  const height = titleH + (rows > 0 ? rows * CARD_H + (rows - 1) * GAP : 0);

  const lines = [];
  const title = cohortTitle(label);
  lines.push(
    `  <text x="${width / 2}" y="${
      yOffset + 22
    }" text-anchor="middle" font-family=${fontAttr()} font-size="20" fill="${
      THEME.titleColor
    }" font-weight="700">${escapeXml(title)}</text>`
  );

  users.forEach((u, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD_X + col * (CARD_W + GAP);
    const y = yOffset + (28 + TITLE_GAP) + row * (CARD_H + GAP);
    lines.push(card(x, y, u, `clip_${label}_${i}`));
  });

  return { width, height, lines };
}

async function main() {
  const files = fs.readdirSync(TEAMS_DIR).filter((f) => f.endsWith(".json"));
  const sorted = files.sort((a, b) => {
    if (a === "DEV-GEN-0.json") return -1;
    if (b === "DEV-GEN-0.json") return 1;
    const na = parseInt(a);
    const nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const cohorts = [];
  for (const file of sorted) {
    const label = path.basename(file, ".json");
    const arr = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), "utf8"));
    if (!Array.isArray(arr))
      throw new Error(
        `Invalid JSON in ${file}: must be an array of {name, handle}`
      );

    const users = [];
    const errors = [];
    for (const [i, entry] of arr.entries()) {
      if (!entry || typeof entry !== "object") {
        errors.push(`Invalid entry at ${file}[${i}]`);
        continue;
      }
      const name = String(entry.name || "").trim();
      const handle = String(entry.handle || "").trim();
      if (!name || !handle) {
        errors.push(`Missing name/handle at ${file}[${i}]`);
        continue;
      }
      const api = await ghUser(handle).catch((e) => ({ error: e.message }));
      if (api.error) {
        errors.push(api.error);
        continue;
      }
      users.push({ handle, displayName: name, avatar: api.avatar });
    }
    if (errors.length)
      throw new Error(`Errors in ${file}:\n- ` + errors.join("\n- "));
    cohorts.push({ label, users });
  }

  const widths = [];
  let totalH = LAYOUT.PAD_Y;
  const cohortLayouts = [];
  for (const c of cohorts) {
    const { width, height, lines } = layoutCohort(c.label, c.users, totalH);
    cohortLayouts.push({ width, height, lines });
    widths.push(width);
    totalH += height + LAYOUT.COHORT_GAP_Y;
  }
  totalH += LAYOUT.PAD_Y - LAYOUT.COHORT_GAP_Y;
  const totalW = Math.max(...widths, 600);

  const parts = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`
  );
  parts.push(
    `  <rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${THEME.pageBg}" />`
  );
  cohortLayouts.forEach((cl) => parts.push(...cl.lines));
  parts.push(`</svg>`);

  fs.writeFileSync(
    path.join(OUT_DIR, "ALL-GENS.svg"),
    parts.join("\n"),
    "utf8"
  );
  console.log("Generated", path.join(OUT_DIR, "ALL-GENS.svg"));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
