import fs from "fs";

const BASE_URL = "https://veiculos.fipe.org.br/api/veiculos";
const DB_FILE = "vehicles-db.json";
const INDEX_FILE = "vehicles-index.json";

// Marcas mais relevantes para autopeças no Brasil
// Chave = como salvar no DB, Valor = palavras para match no nome da FIPE
const MARCAS_RELEVANTES = {
  "FIAT": "fiat",
  "VOLKSWAGEN": "volkswagen",
  "CHEVROLET": "chevrolet",
  "FORD": "ford",
  "TOYOTA": "toyota",
  "HONDA": "honda",
  "HYUNDAI": "hyundai",
  "RENAULT": "renault",
  "NISSAN": "nissan",
  "JEEP": "jeep",
  "MITSUBISHI": "mitsubishi",
  "PEUGEOT": "peugeot",
  "CITROËN": "citro",
  "KIA": "kia",
  "MERCEDES-BENZ": "mercedes",
  "AUDI": "audi",
};

function matchMarca(fipeLabel) {
  const lower = fipeLabel.toLowerCase();
  for (const [nome, keyword] of Object.entries(MARCAS_RELEVANTES)) {
    if (lower.includes(keyword)) return nome;
  }
  return null;
}

const HEADERS = {
  "Referer": "https://veiculos.fipe.org.br",
  "Content-Type": "application/x-www-form-urlencoded",
};

async function postFIPE(endpoint, body, retries = 8) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise(r => setTimeout(r, 200));
      const res = await fetch(`${BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: HEADERS,
        body: new URLSearchParams(body).toString(),
      });
      if (res.status === 429) {
        const wait = 5000 * (i + 1);
        if (i < 3) process.stdout.write("⏳");
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.erro) return null;
      return data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

async function getLatestTable() {
  const tables = await postFIPE("ConsultarTabelaDeReferencia", {});
  return tables[0].Codigo;
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

  const tabela = await getLatestTable();
  console.log(`🚗 Construindo banco de veículos FIPE (tabela ${tabela})...\n`);

  const db = {};
  const index = [];
  let totalModelos = 0;
  let totalAnos = 0;

  // codigoTipoVeiculo: 1 = carros (inclui caminhonetes)
  const tipoVeiculo = 1;
  const tipo = "carros";

  console.log(`📂 Buscando marcas...`);
  const marcas = await postFIPE("ConsultarMarcas", {
    codigoTabelaReferencia: tabela,
    codigoTipoVeiculo: tipoVeiculo,
  });
  if (!marcas) { console.log("⚠ Falha ao buscar marcas"); return; }
  console.log(`   ${marcas.length} marcas encontradas`);

  for (const marca of marcas) {
    const marcaNome = matchMarca(marca.Label);
    if (!marcaNome) continue;

    const modelos = await postFIPE("ConsultarModelos", {
      codigoTabelaReferencia: tabela,
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: marca.Value,
    });
    if (!modelos?.Modelos) { console.log(`   → ${marcaNome}: ⚠ falha, pulando...`); continue; }
    console.log(`   → ${marcaNome}: ${modelos.Modelos.length} modelos`);

    if (!db[marcaNome]) {
      db[marcaNome] = { codigo: marca.Value, tipo, modelos: {} };
    }

    for (const modelo of modelos.Modelos) {
      const modeloNome = modelo.Label;
      totalModelos++;

      const anos = await postFIPE("ConsultarAnoModelo", {
        codigoTabelaReferencia: tabela,
        codigoTipoVeiculo: tipoVeiculo,
        codigoMarca: marca.Value,
        codigoModelo: modelo.Value,
      });
      if (!anos) continue;

      const anosLista = [];
      for (const ano of anos) {
        const anoNum = parseInt(ano.Label);
        if (!isNaN(anoNum) && anoNum !== 32000) {
          const combustivel = ano.Label.replace(/\d+\s*/, "").trim();
          anosLista.push({ codigo: ano.Value, ano: anoNum, combustivel });
          totalAnos++;

          index.push({
            marca: marcaNome,
            modelo: modeloNome,
            ano: anoNum,
            combustivel,
            tipo,
            codigoMarca: marca.Value,
            codigoModelo: String(modelo.Value),
            codigoAno: ano.Value,
          });
        }
      }

      db[marcaNome].modelos[modeloNome] = {
        codigo: String(modelo.Value),
        anos: anosLista,
      };

      // Rate limiting entre modelos
      await new Promise(r => setTimeout(r, 150));
    }

    // Rate limiting entre marcas
    await new Promise(r => setTimeout(r, 500));
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
