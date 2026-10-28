import { db, auth } from "../shared/config/firebaseAdmin";

async function backfillCustomClaims() {
  console.log("[Backfill] Iniciando migracao de custom claims...");

  const snapshot = await db.collection("usuarios").get();
  let atualizados = 0;
  let erros = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = data.uid;
    const role = data.role || "aderido";

    if (!uid || typeof uid !== "string") continue;

    try {
      await auth.setCustomUserClaims(uid, {
        role,
        cargo: role,
        roleAtualizado: true,
      });
      atualizados++;
    } catch (error) {
      console.error(`[Backfill] Erro ao atualizar ${doc.id} (uid: ${uid}):`, error);
      erros++;
    }
  }

  console.log(`[Backfill] Concluido. ${atualizados} atualizados, ${erros} erros.`);
}

backfillCustomClaims()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Backfill] Falha fatal:", error);
    process.exit(1);
  });
