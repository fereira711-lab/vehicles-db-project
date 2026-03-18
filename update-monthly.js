import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "vehicles-db.json");
const LOG_FILE = path.join(__dirname, "update-monthly.log");
const MAX_DAYS = 30;

function log(msg) {
  const line = `[${new Date().toLocaleString("pt-BR")}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function getDaysOld() {
  if (!fs.existsSync(DB_FILE)) return Infinity;
  const stat = fs.statSync(DB_FILE);
  return Math.floor((Date.now() - stat.mtimeMs) / 86400000);
}

async function run() {
  log("=== Verificação mensal do banco FIPE ===");

  const dias = getDaysOld();

  if (dias === Infinity) {
    log("❌ Banco não encontrado. Iniciando build completo...");
  } else {
    log(`📊 Banco tem ${dias} dia(s) de idade.`);
    if (dias <= MAX_DAYS) {
      log(`✅ Banco atualizado (≤ ${MAX_DAYS} dias). Nada a fazer.`);
      return;
    }
    log(`⚠ Banco com mais de ${MAX_DAYS} dias. Iniciando atualização...`);
  }

  try {
    log("🚗 Rodando build-vehicles-db.js...");
    const output = execSync("node build-vehicles-db.js", {
      cwd: __dirname,
      timeout: 600000, // 10 min
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    log(output.trim().split("\n").pop()); // última linha = resumo
    log("✅ Atualização concluída com sucesso!");
  } catch (e) {
    log("❌ Erro na atualização: " + (e.stderr || e.message));
    process.exit(1);
  }
}

run();
