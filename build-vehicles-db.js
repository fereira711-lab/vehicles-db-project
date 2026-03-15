import fs from "fs";

const BASE_URL = "https://parallelum.com.br/fipe/api/v1";
const TIPOS = ["carros", "caminhoes"];
const DB_FILE = "vehicles-db.json";
const INDEX_FILE = "vehicles-index.json";

// Marcas mais relevantes para autopeças no Brasil
const MARCAS_RELEVANTES = new Set([
  "FIAT", "VOLKSWAGEN", "CHEVROLET", "FORD", "TOYOTA", "HONDA",
  "HYUNDAI", "RENAULT", "NISSAN", "JEEP", "MITSUBISHI", "PEUGEOT",
  "CITROËN", "CITROEN", "KIA", "BMW", "MERCEDES-BENZ", "AUDI",
  "DODGE", "RAM",
]);

async function fetchJSON(url, retries = 8) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise(r => setTimeout(r, 300));
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = 5000 * (i + 1);
        if (i < 3) process.stdout.write("⏳");
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

async function buildDB() {
  const checkOnly = process.argv.includes("--check");

  if (checkOnly) {
    if (fs.existsSync(DB_FILE)) {
      const stat = fs.statSync(DB_FILE);
      const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      const marcas = Object.keys(db).length;
      let modelos = 0;
      let anos = 0;
      for (const marca of Object.values(db)) {
        modelos += Object.keys(marca.modelos).length;
        for (const modelo of Object.values(marca.modelos)) {
          anos += modelo.anos.length;
        }
      }
      console.log(`✅ Banco existe: ${DB_FILE}`);
      console.log(`   Gerado em: ${stat.mtime.toLocaleString("pt-BR")}`);
      console.log(`   ${marcas} marcas | ${modelos} modelos | ${anos} variantes`);
      const dias = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
      console.log(`   Idade: ${dias} dias`);
      if (dias > 30) console.log("   ⚠ Banco com mais de 30 dias — considere atualizar com /build-db");
    } else {
      console.log("❌ Banco não encontrado. Rode /build-db para gerar.");
    }
    return;
  }

  console.log("🚗 Construindo banco de veículos FIPE...\n");
  const db = {};
  const index = [];
  let totalModelos = 0;
  let totalAnos = 0;

  for (const tipo of TIPOS) {
    console.log(`📂 Tipo: ${tipo}`);
    const marcas = await fetchJSON(`${BASE_URL}/${tipo}/marcas`);
    if (!marcas) { console.log("   ⚠ Falha ao buscar marcas, pulando..."); continue; }
    console.log(`   ${marcas.length} marcas encontradas`);

    for (const marca of marcas) {
      const marcaNome = marca.nome.toUpperCase();
      if (!MARCAS_RELEVANTES.has(marcaNome)) continue;
      if (!db[marcaNome]) {
        db[marcaNome] = { codigo: marca.codigo, tipo, modelos: {} };
      }

      const modelos = await fetchJSON(`${BASE_URL}/${tipo}/marcas/${marca.codigo}/modelos`);
      if (!modelos?.modelos) { console.log(`   → ${marcaNome}: ⚠ falha, pulando...`); continue; }
      console.log(`   → ${marcaNome}: ${modelos.modelos.length} modelos`);

      for (const modelo of modelos.modelos) {
        const modeloNome = modelo.nome;
        totalModelos++;

        const anos = await fetchJSON(`${BASE_URL}/${tipo}/marcas/${marca.codigo}/modelos/${modelo.codigo}/anos`);
        if (!anos) continue;

        const anosLista = [];
        for (const ano of anos) {
          const anoNum = parseInt(ano.nome);
          if (!isNaN(anoNum)) {
            anosLista.push({ codigo: ano.codigo, ano: anoNum, combustivel: ano.nome.replace(/\d+\s*/, "").trim() });
            totalAnos++;

            index.push({
              marca: marcaNome,
              modelo: modeloNome,
              ano: anoNum,
              combustivel: ano.nome.replace(/\d+\s*/, "").trim(),
              tipo,
              codigoMarca: marca.codigo,
              codigoModelo: modelo.codigo,
              codigoAno: ano.codigo,
            });
          }
        }

        db[marcaNome].modelos[modeloNome] = {
          codigo: modelo.codigo,
          anos: anosLista,
        };

        // Rate limiting entre modelos
        await new Promise(r => setTimeout(r, 150));
      }

      // Rate limiting entre marcas
      await new Promise(r => setTimeout(r, 500));
    }
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index));

  console.log(`\n✅ Banco gerado com sucesso!`);
  console.log(`   ${Object.keys(db).length} marcas | ${totalModelos} modelos | ${totalAnos} variantes`);
  console.log(`   → ${DB_FILE} (${(fs.statSync(DB_FILE).size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`   → ${INDEX_FILE} (${(fs.statSync(INDEX_FILE).size / 1024 / 1024).toFixed(1)} MB)`);
}

buildDB().catch(e => {
  console.error("❌ Erro:", e.message);
  process.exit(1);
});
