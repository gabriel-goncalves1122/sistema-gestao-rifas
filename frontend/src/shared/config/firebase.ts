// ============================================================================
// ARQUIVO: frontend/src/shared/config/firebase.ts
// ============================================================================
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// ============================================================================
// CONFIGURAÇÃO FIREBASE
// ============================================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rifasaderidos2026",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "rifasaderidos2026.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:000000000000:web:0000000000000000000000",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ============================================================================
// EMULADORES LOCAIS
// ============================================================================

declare global {
  interface Window {
    __FIREBASE_EMULATORS_CONNECTED__?: boolean;
  }
}

function normalizarHostConfigurado(valor?: string) {
  return String(valor || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function obterHostEmulador(hostConfigurado?: string) {
  const hostEnv = normalizarHostConfigurado(hostConfigurado);

  if (hostEnv) return hostEnv;

  const hostname = window.location.hostname;

  // Quando estiver acessando no próprio PC, usamos o próprio hostname do request (localhost ou 127.0.0.1).
  // Isso evita problemas de CORS com a porta da Auth e do Firestore.
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return hostname;
  }

  // Quando estiver acessando pelo celular, o hostname será o IP do PC.
  // Exemplo: 192.168.0.123
  return hostname;
}

function formatarHostParaUrl(hostname: string) {
  if (hostname.includes(":") && !hostname.startsWith("[")) {
    return `[${hostname}]`;
  }

  return hostname;
}

// Em ambiente DEV, o uso dos emuladores é padrão resiliente para prevenir chamadas
// acidentais à nuvem da Google, a menos que explicitamente desativado com 'false'.
const deveUsarEmuladores =
  import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== "false";

if (deveUsarEmuladores && !window.__FIREBASE_EMULATORS_CONNECTED__) {
  const authHost = obterHostEmulador(
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST,
  );
  const firestoreHost = obterHostEmulador(
    import.meta.env.VITE_FIRESTORE_EMULATOR_HOST,
  );
  const storageHost = obterHostEmulador(
    import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST,
  );

  const authPort = Number(
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || 9099,
  );

  const firestorePort = Number(
    import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080,
  );

  const storagePort = Number(
    import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT || 9199,
  );

  connectAuthEmulator(
    auth,
    `http://${formatarHostParaUrl(authHost)}:${authPort}`,
    {
      disableWarnings: true,
    },
  );

  connectFirestoreEmulator(db, firestoreHost, firestorePort);

  connectStorageEmulator(storage, storageHost, storagePort);

  window.__FIREBASE_EMULATORS_CONNECTED__ = true;

  if (import.meta.env.DEV) {
    console.log("Firebase Client conectado aos Emuladores Locais");
    console.log(`Auth Emulator: http://${authHost}:${authPort}`);
    console.log(`Firestore Emulator: ${firestoreHost}:${firestorePort}`);
    console.log(`Storage Emulator: ${storageHost}:${storagePort}`);
  }
}
