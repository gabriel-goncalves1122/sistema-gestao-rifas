import * as functions from "firebase-functions/v1";
import { db, auth } from "../../shared/config/firebaseAdmin";

export const onCreateUserSetClaims = functions.auth
  .user()
  .onCreate(async (user) => {
    const { email, uid } = user;
    if (!email || !uid) return;

    try {
      const userDocs = await db
        .collection("usuarios")
        .where("email", "==", email.toLowerCase().trim())
        .limit(1)
        .get();

      if (userDocs.empty) return;

      const userData = userDocs.docs[0].data();
      const role = userData.role || "aderido";

      await auth.setCustomUserClaims(uid, {
        role,
        cargo: role,
        roleAtualizado: true,
      });
    } catch (error) {
      console.error("[AuthTrigger] Erro ao definir custom claims:", error);
    }
  });
