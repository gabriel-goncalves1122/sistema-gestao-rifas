import { db } from "../shared/config/firebaseAdmin";
import * as fs from "fs";

/**
 * Script de Auditoria de Consistência do PIX
 * 
 * Este script varre a base de dados em busca de inconsistências estruturais 
 * entre pagamentos PIX e o estado dos bilhetes, não altera nenhum dado 
 * e gera um arquivo CSV com os resultados.
 */

interface Inconsistencia {
  pagamentoId: string;
  pixIdMercadoPago?: string;
  compradorId?: string;
  statusPagamento: string;
  descricaoInconsistencia: string;
  bilhetesAfetados: number[];
}

async function auditarConsistenciaPix() {
  console.log("[Auditoria] Iniciando auditoria de consistência PIX...");
  
  const pagamentosSnapshot = await db.collection("pagamentos_pix").get();
  const inconsistencias: Inconsistencia[] = [];
  
  let pagamentosProcessados = 0;
  
  for (const doc of pagamentosSnapshot.docs) {
    const data = doc.data();
    const pagamentoId = doc.id;
    const { status, rifas_ids, pix_id, comprador_id } = data;
    
    pagamentosProcessados++;
    
    if (!rifas_ids || !Array.isArray(rifas_ids) || rifas_ids.length === 0) {
      inconsistencias.push({
        pagamentoId,
        pixIdMercadoPago: pix_id,
        compradorId: comprador_id,
        statusPagamento: status,
        descricaoInconsistencia: "Pagamento sem array de rifas_ids ou array vazio.",
        bilhetesAfetados: []
      });
      continue;
    }
    
    const bilhetesRefs = rifas_ids.map(id => db.collection("rifas").doc(String(id)));
    
    if (bilhetesRefs.length === 0) continue;
    
    // Ler bilhetes
    const bilhetesSnapshots = await db.getAll(...bilhetesRefs);
    
    const bilhetesProblemas: number[] = [];
    let tipoProblema = "";
    
    for (const bilheteSnap of bilhetesSnapshots) {
      if (!bilheteSnap.exists) {
        bilhetesProblemas.push(Number(bilheteSnap.id));
        tipoProblema = "Bilhete não existe na coleção rifas.";
        continue;
      }
      
      const bilhete = bilheteSnap.data()!;
      const num = Number(bilheteSnap.id);
      
      if (status === "approved" || status === "paid") {
        if (bilhete.status !== "pago") {
          bilhetesProblemas.push(num);
          tipoProblema = `Pagamento aprovado, mas bilhete com status '${bilhete.status}'.`;
        } else if (bilhete.pix_reference_id !== pagamentoId) {
          bilhetesProblemas.push(num);
          tipoProblema = `Pagamento aprovado, mas bilhete pertence a outro pix_reference_id ('${bilhete.pix_reference_id}').`;
        }
      } else if (status === "cancelled" || status === "rejected") {
        if (bilhete.pix_reference_id === pagamentoId && bilhete.status !== "disponivel") {
           bilhetesProblemas.push(num);
           tipoProblema = `Pagamento cancelado/rejeitado, mas bilhete com status '${bilhete.status}'.`;
        }
      }
    }
    
    if (bilhetesProblemas.length > 0) {
       inconsistencias.push({
         pagamentoId,
         pixIdMercadoPago: pix_id,
         compradorId: comprador_id,
         statusPagamento: status,
         descricaoInconsistencia: tipoProblema,
         bilhetesAfetados: bilhetesProblemas
       });
    }
  }
  
  console.log(`[Auditoria] Concluído. ${pagamentosProcessados} pagamentos analisados.`);
  console.log(`[Auditoria] Encontradas ${inconsistencias.length} inconsistências.`);
  
  if (inconsistencias.length > 0) {
    const csvLines = ["PagamentoID,PixIDMercadoPago,CompradorID,StatusPagamento,DescricaoInconsistencia,BilhetesAfetados"];
    
    for (const inc of inconsistencias) {
      const line = [
        inc.pagamentoId,
        inc.pixIdMercadoPago || "",
        inc.compradorId || "",
        inc.statusPagamento || "",
        `"${inc.descricaoInconsistencia}"`,
        `"${inc.bilhetesAfetados.join(",")}"`
      ].join(",");
      csvLines.push(line);
    }
    
    fs.writeFileSync("inconsistencias_pix.csv", csvLines.join("\n"));
    console.log("[Auditoria] Resultados salvos em 'inconsistencias_pix.csv'.");
  }
}

auditarConsistenciaPix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Auditoria] Falha fatal:", error);
    process.exit(1);
  });
