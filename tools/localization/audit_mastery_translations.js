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
      const key = source.trim().replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n");
      if (key && translation.trim() && !translations.has(key)) {
        translations.set(key, { translation: translation.trim(), file });
      }
    }
  }
  return translations;
}

function decodeLuaString(value) {
  return JSON.parse(value);
}

function loadMasteryStrings(treeFile) {
  const text = fs.readFileSync(treeFile, "utf8");
  const required = new Map();
  for (const block of text.split(/(?=^\s{8}\[\d+\]\s*=\s*\{)/m)) {
    if (!block.includes('["isMastery"]= true')) continue;
    const name = block.match(/\["name"\]\s*=\s*("(?:\\.|[^"\\])*")/);
    const masteryName = name ? decodeLuaString(name[1]) : "Unknown Mastery";
    if (name) required.set(masteryName, { type: "name", mastery: masteryName });
    const effects = block.match(/\["masteryEffects"\]\s*=\s*\{([\s\S]*?)^\s{12}\},/m);
    if (!effects) continue;
    for (const match of effects[1].matchAll(/^\s{24}("(?:\\.|[^"\\])*")/gm)) {
      required.set(decodeLuaString(match[1]), { type: "stat", mastery: masteryName });
    }
  }
  return required;
}

const translationDir = process.argv[2];
const translations = loadTranslations(translationDir);
const required = new Map();
for (const tree of process.argv.slice(3)) {
  for (const [text, info] of loadMasteryStrings(tree)) required.set(text, info);
}
const missing = [...required]
  .filter(([text]) => !translations.has(text))
  .map(([text, info]) => ({ ...info, text }));

console.log(JSON.stringify({
  required: required.size,
  translated: required.size - missing.length,
  missing,
}, null, 2));
