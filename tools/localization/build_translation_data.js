const fs = require("fs");
const path = require("path");

const source = process.argv[2];
const output = process.argv[3];

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      fields.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  fields.push(value);
  return fields;
}

function decodeEscapes(value) {
  return value
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\t", "\t");
}

const map = new Map();
for (const name of fs.readdirSync(source).filter((name) => name.endsWith(".csv")).sort()) {
  const content = fs.readFileSync(path.join(source, name), "utf8").replace(/^\uFEFF/, "");
  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const fields = parseCsvLine(rawLine);
    const english = decodeEscapes((fields[0] || "").trim());
    const chinese = decodeEscapes((fields[1] || "").trim());
    if (english && chinese && english !== chinese && !map.has(english)) {
      map.set(english, chinese);
    }
  }
}

const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const lines = [
  "-- Generated from Chuanhsing/PoeCharm translate_cn CSV files.",
  "-- Do not edit by hand.",
  "return {",
  ...entries.map(([key, value]) => `\t[${JSON.stringify(key)}] = ${JSON.stringify(value)},`),
  "}",
  "",
];
fs.writeFileSync(output, lines.join("\n"), "utf8");
console.log(`Generated ${entries.length} translations at ${output}`);
