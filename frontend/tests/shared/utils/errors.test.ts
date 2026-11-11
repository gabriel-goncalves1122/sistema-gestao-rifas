import { describe, it, expect } from "vitest";
import { extrairMensagemErro } from "@/shared/utils/errors";

describe("Utilitário: extrairMensagemErro", () => {
  it("Deve extrair mensagem de instâncias de Error", () => {
    expect(extrairMensagemErro(new Error("Falha de rede"))).toBe(
      "Falha de rede",
    );
  });

  it("Deve extrair string não vazia diretamente", () => {
    expect(extrairMensagemErro("Token expirado")).toBe("Token expirado");
  });

  it("Deve extrair campo message de objetos literais de erro", () => {
    expect(extrairMensagemErro({ message: "Erro do servidor" })).toBe(
      "Erro do servidor",
    );
  });

  it("Deve retornar fallback quando o valor for vazio, nulo ou desconhecido", () => {
    expect(extrairMensagemErro(null, "Erro padrão")).toBe("Erro padrão");
    expect(extrairMensagemErro(undefined, "Erro padrão")).toBe("Erro padrão");
    expect(extrairMensagemErro(new Error("   "), "Erro padrão")).toBe(
      "Erro padrão",
    );
    expect(extrairMensagemErro({ code: 500 }, "Erro padrão")).toBe(
      "Erro padrão",
    );
  });
});
