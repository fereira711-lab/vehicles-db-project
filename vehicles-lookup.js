import fs from "fs";

const INDEX_FILE = "vehicles-index.json";

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error("❌ Banco não encontrado. Rode: node build-vehicles-db.js");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
}

export function searchVehicles(query) {
  const index = loadIndex();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return index.filter(v => {
    const text = `${v.marca} ${v.modelo} ${v.ano} ${v.combustivel} ${v.tipo}`.toLowerCase();
    return terms.every(t => text.includes(t));
  });
}

export function groupByMarca(results) {
  const grouped = {};
  for (const v of results) {
    if (!grouped[v.marca]) grouped[v.marca] = {};
    if (!grouped[v.marca][v.modelo]) grouped[v.marca][v.modelo] = [];
    grouped[v.marca][v.modelo].push(v.ano);
  }
  // Ordena anos e remove duplicatas
  for (const marca of Object.values(grouped)) {
    for (const [modelo, anos] of Object.entries(marca)) {
      marca[modelo] = [...new Set(anos)].sort((a, b) => a - b);
    }
  }
  return grouped;
}

export function formatResults(results) {
  const grouped = groupByMarca(results);
  const lines = [];
  for (const [marca, modelos] of Object.entries(grouped).sort()) {
    lines.push(`\n${marca}`);
    for (const [modelo, anos] of Object.entries(modelos).sort()) {
      const anoRange = anos.length > 2
        ? `${anos[0]} a ${anos[anos.length - 1]}`
        : anos.join(", ");
      lines.push(`  ${modelo} — ${anoRange}`);
    }
  }
  return lines.join("\n");
}

// CLI
if (process.argv[1]?.endsWith("vehicles-lookup.js")) {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.log("Uso: node vehicles-lookup.js <marca> <modelo> <ano>");
    console.log("Ex:  node vehicles-lookup.js Ford Ka 2019");
    process.exit(0);
  }
  const results = searchVehicles(query);
  if (results.length === 0) {
    console.log("Nenhum veículo encontrado.");
  } else {
    console.log(`${results.length} resultado(s):`);
    console.log(formatResults(results));
  }
}
