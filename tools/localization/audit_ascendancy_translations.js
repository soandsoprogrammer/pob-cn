const fs = require("fs");
const path = require("path");

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted && ch === '"' && line[i + 1] === '"') {
      value += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      fields.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  fields.push(value);
  return fields;
}

function loadTranslations(directory) {
  const translations = new Map();
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".csv")).sort()) {
    const text = fs.readFileSync(path.join(directory, file), "utf8").replace(/^\uFEFF/, "");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [source = "", translation = ""] = parseCsvLine(line);
      const normalizedSource = source.trim().replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n");
      if (normalizedSource && translation.trim() && !translations.has(normalizedSource)) {
        translations.set(normalizedSource, { translation: translation.trim(), file });
      }
    }
  }
  return translations;
}

function decodeLuaString(quoted) {
  return JSON.parse(quoted);
}

function loadAscendancyStrings(treeFile) {
  const text = fs.readFileSync(treeFile, "utf8");
  const strings = new Map();
  const coreAscendancies = new Set([
    "Berserker", "Chieftain", "Juggernaut", "Slayer", "Gladiator", "Champion",
    "Hierophant", "Guardian", "Inquisitor", "Necromancer", "Occultist",
    "Elementalist", "Assassin", "Trickster", "Saboteur", "Deadeye", "Raider",
    "Warden", "Pathfinder", "Ascendant",
  ]);
  const blocks = text.split(/(?=^\s{8}\[\d+\]\s*=\s*\{)/m);
  for (const block of blocks) {
    const ascendancy = block.match(/\["ascendancyName"\]\s*=\s*"([^"]+)"/);
    if (!ascendancy || !coreAscendancies.has(ascendancy[1])) continue;
    if (!block.includes('["isNotable"]= true')) continue;
    const name = block.match(/\["name"\]\s*=\s*("(?:\\.|[^"\\])*")/);
    if (name) strings.set(decodeLuaString(name[1]), "name");
    const lines = block.split(/\r?\n/);
    const statsStart = lines.findIndex((line) => line.includes('["stats"]') && line.includes("{"));
    if (statsStart >= 0 && !lines[statsStart].includes("{}")) {
      for (let i = statsStart + 1; i < lines.length && lines[i].trim() !== "},"; i++) {
        for (const value of lines[i].matchAll(/("(?:\\.|[^"\\])*")/g)) {
        strings.set(decodeLuaString(value[1]), "stat");
        }
      }
    }
  }
  return strings;
}

const translationDir = process.argv[2];
const trees = process.argv.slice(3);
const translations = loadTranslations(translationDir);
const required = new Map();
for (const tree of trees) {
  for (const [text, type] of loadAscendancyStrings(tree)) required.set(text, type);
}

const missing = [];
for (const [text, type] of required) {
  if (translations.has(text)) continue;
  const escaped = text.replaceAll("\n", "\\n");
  missing.push({
    type,
    text,
    escapedMatch: escaped !== text ? translations.get(escaped) || null : null,
  });
}

console.log(JSON.stringify({
  required: required.size,
  translated: required.size - missing.length,
  missing,
}, null, 2));
