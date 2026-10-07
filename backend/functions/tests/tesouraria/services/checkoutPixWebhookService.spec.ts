import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockRunTransaction = jest.fn<any>();
const mockConsultarPedido = jest.fn<any>();
const mockTransactionSet = jest.fn<any>();

const pagamentos = new Map<string, any>();
const bilhetes = new Map<string, any>();
const notificacoes = new Map<string, any>();

type CollectionName = "pagamentos_pix" | "bilhetes" | "notificacoes";

interface MockRef {
  collectionName: CollectionName;
  id: string;
  get: () => Promise<{ exists: boolean; data: () => any }>;
  set: (data: any, options?: { merge?: boolean }) => Promise<void>;
}

function storeFor(collectionName: CollectionName) {
  if (collectionName === "pagamentos_pix") return pagamentos;
  if (collectionName === "bilhetes") return bilhetes;
  return notificacoes;
}

function makeRef(collectionName: CollectionName, id: string): MockRef {
  const store = storeFor(collectionName);

  return {
    collectionName,
    id,
    get: async () => ({
      exists: store.has(id),
      data: () => store.get(id),
      ref: makeRef(collectionName, id),
    }),
    set: async (data: any, options?: { merge?: boolean }) => {
      const atual = store.get(id) || {};
      store.set(id, options?.merge ? { ...atual, ...data } : data);
    },
  };
}

function makeCollection(collectionName: CollectionName) {
  return {
    doc: (id?: string) => {
      if (id) return makeRef(collectionName, id);
      return makeRef(collectionName, `${collectionName}_AUTO`);
    },
    where: (field: string, op: string, value: any) => ({
      limit: () => ({
        get: async () => {
          const store = storeFor(collectionName);
          const results: any[] = [];
          for (const [id, doc] of store.entries()) {
            if (doc && doc[field] === value) {
              results.push({
                id,
                ref: makeRef(collectionName, id),
                data: () => doc,
              });
            }
          }
          console.log(`[MOCK WHERE] collection=${collectionName}, field=${field}, value=${value}, storeSize=${store.size}, results=${results.length}`);
          return {
            empty: results.length === 0,
            docs: results,
          };
        }
      })
    })
  };
}

jest.mock("firebase-admin", () => {
  const firestoreMock: any = jest.fn().mockReturnValue({
    collection: jest.fn((nome: CollectionName) => makeCollection(nome)),
    runTransaction: mockRunTransaction,
  });
  firestoreMock.FieldValue = {
    delete: jest.fn().mockReturnValue("__DELETE__"),
  };
  return { firestore: firestoreMock };
});

jest.mock("firebase-admin/firestore", () => {
  return {
    FieldValue: {
      delete: jest.fn().mockReturnValue("__DELETE__"),
    }
  };
});

jest.mock("../../../src/shared/services/mercadoPagoPixClient", () => ({
  MercadoPagoPixClient: {
    consultarPedido: mockConsultarPedido,
  },
}));

import { CheckoutPixWebhookService } from "../../../src/modules/tesouraria/services/checkoutPixWebhookService";

describe("Service: CheckoutPixWebhookService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pagamentos.clear();
    bilhetes.clear();
    notificacoes.clear();

    mockRunTransaction.mockImplementation(async (callback: any) => {
      return callback({
        get: async (ref: MockRef) => ref.get(),
        getAll: async (...refs: MockRef[]) => Promise.all(refs.map((r) => r.get())),
        set: (ref: MockRef, data: any, options?: { merge?: boolean }) => {
          mockTransactionSet(ref, data, options);
          const store = storeFor(ref.collectionName);
          const atual = store.get(ref.id) || {};
          store.set(ref.id, options?.merge ? { ...atual, ...data } : data);
        },
      });
    });

    mockConsultarPedido.mockResolvedValue(null);
  });

  it("Deve ignorar webhook sem ID", async () => {
    const resultado = await CheckoutPixWebhookService.processarWebhook({
      payload: { action: "payment.updated" },
      rawBody: "{}",
    });

    expect(resultado).toEqual({
      sucesso: true,
      ignorado: true,
      motivo: "sem_payment_id",
    });
  });

  it("Deve ignorar webhook que não é de pagamento", async () => {
    const resultado = await CheckoutPixWebhookService.processarWebhook({
      payload: { action: "test.created", data: { id: "123" } },
      rawBody: "{}",
    });

    expect(resultado).toEqual({
      sucesso: true,
      ignorado: true,
      motivo: "nao_e_payment_updated",
    });
  });

  it("Deve retornar sucesso com ignorado se pedido não for encontrado no Mercado Pago", async () => {
    mockConsultarPedido.mockResolvedValue(null);

    const resultado = await CheckoutPixWebhookService.processarWebhook({
      payload: { action: "payment.updated", data: { id: "ORDE_001" } },
      rawBody: "{}",
    });

    expect(resultado).toEqual({
      sucesso: true,
      ignorado: true,
      motivo: "MERCADOPAGO_PAYMENT_NOT_FOUND",
    });
  });

  it("Deve marcar rifas como pendentes quando o banco confirmar pagamento", async () => {
    pagamentos.set("ORDE_001", {
      id: "ORDE_001",
      pix_order_id: "ORDE_001",
      status_pagamento_banco: "WAITING",
      numeros_rifas: ["001", "002"],
      valor_bruto: 20,
    });
    bilhetes.set("001", { status: "reservado" });
    bilhetes.set("002", { status: "reservado" });

    mockConsultarPedido.mockResolvedValue({
      id: "ORDE_001",
      status: "approved",
      transaction_amount: 20,
    });

    const resultado = await CheckoutPixWebhookService.processarWebhook({
      payload: { action: "payment.updated", data: { id: "ORDE_001" } },
      rawBody: "{}",
    });

    expect(resultado).toEqual({
      sucesso: true,
      idempotente: false,
      status: "approved",
    });

    expect(pagamentos.get("ORDE_001").status_pagamento_banco).toBe("approved");
    expect(bilhetes.get("001").status_pagamento_banco).toBe("approved");
    expect(bilhetes.get("002").status_pagamento_banco).toBe("approved");
  });

  it("Deve liberar rifas e criar notificação quando o banco cancelar", async () => {
    pagamentos.set("ORDE_002", {
      id: "ORDE_002",
      vendedor_id: "ADERIDO_TESTE",
      pix_order_id: "ORDE_002",
      status_pagamento_banco: "WAITING",
      numeros_rifas: ["010"],
    });
    bilhetes.set("010", { status: "reservado", comprador_id: "123" });

    mockConsultarPedido.mockResolvedValue({
      id: "ORDE_002",
      status: "rejected",
    });

    const resultado = await CheckoutPixWebhookService.processarWebhook({
      payload: { action: "payment.updated", data: { id: "ORDE_002" } },
      rawBody: "{}",
    });

    expect(resultado).toEqual({
      sucesso: true,
      idempotente: false,
      status: "rejected",
    });

    expect(pagamentos.get("ORDE_002").status_pagamento_banco).toBe("rejected");
    expect(bilhetes.get("010").status).toBe("disponivel");
    expect(bilhetes.get("010").comprador_id).toBe("__DELETE__");
    expect(notificacoes.size).toBe(1);
  });

  it("Deve tratar payload repetido como idempotente", async () => {
    pagamentos.set("ORDE_003", {
      id: "ORDE_003",
      pix_order_id: "ORDE_003",
      status_pagamento_banco: "approved",
      status: "ativo",
      numeros_rifas: ["001"],
    });

    mockConsultarPedido.mockResolvedValue({
      id: "ORDE_003",
      status: "approved",
    });

    const resultado = await CheckoutPixWebhookService.processarWebhook({
      payload: { action: "payment.updated", data: { id: "ORDE_003" } },
      rawBody: "{}",
    });

    expect(resultado).toEqual({
      sucesso: true,
      idempotente: true,
      status: "approved",
    });
  });
});
