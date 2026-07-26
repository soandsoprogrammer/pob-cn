const fs = require("fs");

function decodeHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseGroups(html, locale) {
  const groups = new Map();
  const re = new RegExp(
    `href="/${locale}/([^"]+_Mastery)"[^>]*>([^<]+)</a>[\\s\\S]*?<ul class="PassiveMastery">([\\s\\S]*?)</ul>`,
    "g",
  );
  for (const match of html.matchAll(re)) {
    const lines = [...match[3].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
      .flatMap((item) => decodeHtml(item[1]).split("\n"))
      .filter(Boolean);
    groups.set(match[1], { name: decodeHtml(match[2]), lines });
  }
  return groups;
}

function csv(value) {
  return `"${value.replaceAll('"', '""').replaceAll("\n", "\\n")}"`;
}

async function main() {
  const [output] = process.argv.slice(2);
  const fetchUtf8 = (url) => fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => new TextDecoder("utf-8").decode(buffer));
  const [usHtml, cnHtml] = await Promise.all([
    fetchUtf8("https://poedb.tw/us/Passive_mastery"),
    fetchUtf8("https://poedb.tw/cn/Passive_mastery"),
  ]);
  const us = parseGroups(usHtml, "us");
  const cn = parseGroups(cnHtml, "cn");
  const entries = [];
  const warnings = [];
  for (const [slug, english] of us) {
    const chinese = cn.get(slug);
    if (!chinese) {
      warnings.push(`${slug}: missing Chinese group`);
      continue;
    }
    entries.push([english.name, chinese.name]);
    if (english.lines.length !== chinese.lines.length) {
      warnings.push(`${slug}: ${english.lines.length} English lines, ${chinese.lines.length} Chinese lines`);
      continue;
    }
    for (let i = 0; i < english.lines.length; i++) {
      entries.push([english.lines[i], chinese.lines[i]]);
    }
  }
  fs.writeFileSync(output, entries.map(([en, zh]) => `${csv(en)},${csv(zh)}`).join("\n") + "\n", "utf8");
  console.log(JSON.stringify({ groups: us.size, entries: entries.length, warnings }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
