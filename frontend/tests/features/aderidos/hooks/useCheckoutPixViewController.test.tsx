import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";

import {
  obterDadosFormularioCheckoutInicial,
  useCheckoutPixViewController,
} from "@/features/aderidos/hooks/useCheckoutPixViewController";
import { checkoutStorage } from "@/features/aderidos/utils/checkoutStorage";

describe("Hook: useCheckoutPixViewController", () => {
  beforeEach(() => {
    checkoutStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restaura dados salvos e sincroniza alterações do formulário no storage", () => {
    checkoutStorage.update({
      formData: {
        nome: "Ana",
        telefone: "(35) 99999-0000",
        email: "ana@unifei.edu.br",
        documento: "123.456.789-01",
      },
    });

    expect(obterDadosFormularioCheckoutInicial()).toEqual({
      nome: "Ana",
      telefone: "(35) 99999-0000",
      email: "ana@unifei.edu.br",
      documento: "123.456.789-01",
    });

    const { result } = renderHook(() => {
      const { watch, setValue } = useForm({
        defaultValues: {
          nome: "Ana",
          telefone: "(35) 99999-0000",
          email: "ana@unifei.edu.br",
        },
      });
      const controller = useCheckoutPixViewController({
        watch,
        incluirDocumento: false,
        mensagemConfirmacaoCancelamento: "Confirma cancelar?",
        copiarPix: vi.fn(),
        cancelarPix: vi.fn(),
        setSnackbarOpen: vi.fn(),
      });
      return { setValue, ...controller };
    });

    act(() => {
      result.current.setValue("nome", "Ana Atualizada");
    });

    expect(checkoutStorage.get().formData).toEqual({
      nome: "Ana Atualizada",
      telefone: "(35) 99999-0000",
      email: "ana@unifei.edu.br",
      documento: "123.456.789-01",
    });
  });

  it("dispara snackbar ao copiar Pix com sucesso e exige confirmação ao cancelar", () => {
    const copiarPix = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    const cancelarPix = vi.fn();
    const setSnackbarOpen = vi.fn();
    const confirmMock = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirmMock);

    const { result } = renderHook(() => {
      const { watch } = useForm({
        defaultValues: { nome: "", telefone: "", email: "", documento: "" },
      });
      return useCheckoutPixViewController({
        watch,
        incluirDocumento: true,
        mensagemConfirmacaoCancelamento: "Deseja realmente cancelar?",
        copiarPix,
        cancelarPix,
        setSnackbarOpen,
      });
    });

    act(() => {
      result.current.handleCopiarPix();
    });
    expect(setSnackbarOpen).toHaveBeenCalledWith(true);

    act(() => {
      result.current.handleCopiarPix();
    });
    expect(setSnackbarOpen).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleCancelarPixExplicito();
    });
    expect(confirmMock).toHaveBeenCalledWith("Deseja realmente cancelar?");
    expect(cancelarPix).not.toHaveBeenCalled();

    act(() => {
      result.current.handleCancelarPixExplicito();
    });
    expect(cancelarPix).toHaveBeenCalledWith(false);
  });
});
