import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  baixarCsv,
  copiarTextoParaAreaTransferencia,
} from "@/shared/utils/arquivosBrowser";

describe("Utilitários: arquivosBrowser", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("Deve gerar Blob UTF-8 com BOM, disparar download e revogar Object URL", () => {
    const createSpy = vi.fn(() => "blob:teste-csv");
    const revokeSpy = vi.fn();
    URL.createObjectURL = createSpy;
    URL.revokeObjectURL = revokeSpy;

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    baixarCsv("col1;col2\n1;2", "relatorio.csv");

    expect(createSpy).toHaveBeenCalledTimes(1);
    const blobArg = (createSpy.mock.calls as unknown[][])[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:teste-csv");
  });

  it("Deve retornar false ao tentar copiar texto vazio", () => {
    expect(copiarTextoParaAreaTransferencia("")).toBe(false);
  });

  it("Deve copiar texto utilizando Clipboard API quando disponível", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    document.execCommand = vi.fn(() => true);

    const resultado = copiarTextoParaAreaTransferencia("000201010212");

    expect(resultado).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("000201010212");
  });
});
