/**
 * Script de sincronização e regularização das faixas de rifas e métricas operacionais
 * dos aderidos legados no Firestore de Produção.
 *
 * Popula `faixa_rifas`, `modalidade_adesao`, `meta_vendas`, `rifas_vendidas` e `total_arrecadado`
 * nos documentos da coleção `usuarios` que estão sem essas propriedades, mantendo
 * total harmonia e consistência com os membros cadastrados recentemente.
 *
 * Suporta dois modos:
 *   --dry-run   : Apenas simula e exibe as alterações sem realizar commits no banco
 *   --producao  : Executa as alterações em lotes atômicos (db.batch) diretamente no Firestore
 *
 * @sideEffects Atualização atômica em lote (merge: true) na coleção `usuarios`.
 */

import * as admin from "firebase-admin";
import * as path from "path";

// Inicialização com chave administrativa de produção
const keyPath = path.resolve(__dirname, "chave-privada.json");
const serviceAccount = require(keyPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "rifasaderidos2026",
  });
}

const db = admin.firestore();

interface BilheteFirestore {
  numero: string;
  status: string;
  vendedor_id?: string;
  valor_pago?: number;
}

interface UsuarioFirestore {
  id?: string;
  nome?: string;
  posicao_adesao?: number;
  modalidade_adesao?: "completo" | "meio";
  meta_vendas?: number;
  rifas_vendidas?: number;
  total_arrecadado?: number;
  faixa_rifas?: {
    inicio?: string;
    fim?: string;
  };
}

interface PatchAderido {
  id: string;
  nome?: string;
  dados: {
    faixa_rifas: {
      inicio: string;
      fim: string;
    };
    modalidade_adesao: "completo" | "meio";
    meta_vendas: number;
    rifas_vendidas: number;
    total_arrecadado: number;
    atualizado_em: string;
  };
}

/**
 * Executa a análise comparativa entre as coleções `usuarios` e `bilhetes` e aplica
 * a sincronização em lotes atômicos caso não esteja em modo dry-run.
 */
async function sincronizarFaixasRifas() {
  const isDryRun = process.argv.includes("--dry-run");
  const isProducao = process.argv.includes("--producao");

  if (!isDryRun && !isProducao) {
    console.log("Modo padrão ativado: execute com --dry-run para simular ou --producao para aplicar no Firestore.");
  }

  console.log("================================================================================");
  console.log(`SINCRONIZAÇÃO DE FAIXAS DE RIFAS - MODO: ${isDryRun ? "DRY-RUN (SIMULAÇÃO)" : "PRODUÇÃO"}`);
  console.log("================================================================================\n");

  console.log("1. Carregando coleções do Firestore (usuarios e bilhetes)...");
  const [usersSnap, bilhetesSnap] = await Promise.all([
    db.collection("usuarios").get(),
    db.collection("bilhetes").get(),
  ]);

  console.log(`✓ Total de usuários: ${usersSnap.size}`);
  console.log(`✓ Total de bilhetes: ${bilhetesSnap.size}\n`);

  console.log("2. Indexando bilhetes por vendedor_id...");
  const bilhetesPorVendedor = new Map<string, BilheteFirestore[]>();

  bilhetesSnap.forEach((doc) => {
    const bilhete = doc.data() as BilheteFirestore;
    const vendedorId = bilhete.vendedor_id;
    if (!vendedorId) return;

    if (!bilhetesPorVendedor.has(vendedorId)) {
      bilhetesPorVendedor.set(vendedorId, []);
    }
    bilhetesPorVendedor.get(vendedorId)!.push(bilhete);
  });

  const patches: PatchAderido[] = [];
  const jaValidos: string[] = [];
  const anomalias: Array<{ id: string; motivo: string }> = [];
  const timestamp = new Date().toISOString();

  console.log("3. Analisando consistência de cada aderido...");

  usersSnap.forEach((doc) => {
    const usuario = doc.data() as UsuarioFirestore;
    const idAderido = doc.id;
    const bilhetes = bilhetesPorVendedor.get(idAderido) || [];

    // Se já possui faixa_rifas preenchida e válida
    if (usuario.faixa_rifas?.inicio && usuario.faixa_rifas?.fim) {
      jaValidos.push(idAderido);
      return;
    }

    // Se o aderido não possui nenhum bilhete associado no banco
    if (bilhetes.length === 0) {
      anomalias.push({ id: idAderido, motivo: "Nenhum bilhete atribuído na coleção bilhetes" });
      return;
    }

    // Ordenação numérica rigorosa dos números das rifas
    bilhetes.sort((a, b) => Number(a.numero) - Number(b.numero));

    const inicio = String(bilhetes[0].numero).padStart(5, "0");
    const fim = String(bilhetes[bilhetes.length - 1].numero).padStart(5, "0");
    const qtdBilhetes = bilhetes.length;

    const modalidade: "completo" | "meio" =
      usuario.modalidade_adesao || (qtdBilhetes === 60 ? "meio" : "completo");

    const metaVendas =
      usuario.meta_vendas || (modalidade === "meio" ? 600 : 1200);

    const bilhetesPagos = bilhetes.filter((b) => b.status === "pago");
    const rifasVendidas = bilhetesPagos.length;
    const totalArrecadado = bilhetesPagos.reduce(
      (soma, b) => soma + (Number(b.valor_pago) || 10),
      0
    );

    patches.push({
      id: idAderido,
      nome: usuario.nome,
      dados: {
        faixa_rifas: {
          inicio,
          fim,
        },
        modalidade_adesao: modalidade,
        meta_vendas: metaVendas,
        rifas_vendidas: rifasVendidas,
        total_arrecadado: totalArrecadado,
        atualizado_em: timestamp,
      },
    });
  });

  console.log("\n--------------------------------------------------------------------------------");
  console.log("RESUMO DA AUDITORIA:");
  console.log(`- Usuários já com faixa válida (inalterados): ${jaValidos.length}`);
  console.log(`- Usuários identificados para regularização : ${patches.length}`);
  console.log(`- Usuários com anomalias de bilhetes       : ${anomalias.length}`);
  console.log("--------------------------------------------------------------------------------\n");

  if (anomalias.length > 0) {
    console.error("ALERTA: Foram encontradas anomalias nos seguintes aderidos:", anomalias);
    if (!isDryRun) {
      throw new Error("Abortando operação devido a anomalias de dados.");
    }
  }

  // Exemplos de patch
  console.log("Amostra dos 3 primeiros patches calculados:");
  console.log(JSON.stringify(patches.slice(0, 3), null, 2));

  console.log("\nAmostra dos 3 últimos patches calculados:");
  console.log(JSON.stringify(patches.slice(-3), null, 2));

  if (isDryRun || !isProducao) {
    console.log("\n[DRY-RUN] Nenhuma gravação foi realizada no Firestore. Execute com --producao para aplicar.");
    return;
  }

  console.log(`\n4. Gravando patches de ${patches.length} aderidos no Firestore em lotes atômicos...`);

  const BATCH_SIZE = 400; // Limite do Firestore é 500
  let commitCount = 0;

  for (let i = 0; i < patches.length; i += BATCH_SIZE) {
    const chunk = patches.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const item of chunk) {
      const userRef = db.collection("usuarios").doc(item.id);
      batch.set(userRef, item.dados, { merge: true });
    }

    await batch.commit();
    commitCount += chunk.length;
    console.log(`✓ Gravados com sucesso: ${commitCount} / ${patches.length} aderidos.`);
  }

  console.log("\n================================================================================");
  console.log("✓ SUCESSO ABSOLUTO: Todos os aderidos foram sincronizados com sucesso no Firestore!");
  console.log("================================================================================");
}

sincronizarFaixasRifas()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO FATAL NA EXECUÇÃO:", err);
    process.exit(1);
  });
