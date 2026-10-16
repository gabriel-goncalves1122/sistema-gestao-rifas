// ============================================================================
// ARQUIVO: frontend/tests/features/rifas/components/ModalDetalhesRifa.test.tsx
// ============================================================================
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ModalDetalhesRifa } from "@/features/aderidos/ModalDetalhesRifa";

const rifa = {
  numero: "050",
  status: "pago",
  comprador_nome: "Ana Beatriz",
  comprador_telefone: "(11) 98765-4321",
  comprador_email: "ana@email.com",
  data_reserva: "2026-05-10T11:30:00.000Z",
  data_pagamento: null,
};

describe("Componente <ModalDetalhesRifa />", () => {
  it("Não deve renderizar o modal se rifa for null", () => {
    render(<ModalDetalhesRifa open={true} onClose={vi.fn()} rifa={null} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Deve exibir as informações da rifa quando aberto", () => {
    render(<ModalDetalhesRifa open={true} onClose={vi.fn()} rifa={rifa} />);

    expect(
      screen.getByRole("dialog")
    ).toBeInTheDocument();

    expect(screen.getByText("#050")).toBeInTheDocument();
    expect(screen.getByText("Ana Beatriz")).toBeInTheDocument();
    expect(screen.getByText("(11) 98765-4321")).toBeInTheDocument();
    expect(screen.getByText("ana@email.com")).toBeInTheDocument();
  });

  it("Deve fechar o modal ao clicar no botão Fechar", () => {
    const mockOnClose = vi.fn();

    render(<ModalDetalhesRifa open={true} onClose={mockOnClose} rifa={rifa} />);

    fireEvent.click(screen.getByRole("button", { name: /Sair/i }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("Deve exibir alerta de correção solicitada e acionar onCorrigirDados quando correcao_pendente for true", () => {
    const mockCorrigir = vi.fn();
    const rifaComPendencia = {
      ...rifa,
      correcao_pendente: true,
      motivo_recusa: "Telefone incompleto no cadastro",
    };

    render(
      <ModalDetalhesRifa
        open={true}
        onClose={vi.fn()}
        rifa={rifaComPendencia}
        onCorrigirDados={mockCorrigir}
      />,
    );

    expect(
      screen.getByText(/Correção de cadastro solicitada/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Telefone incompleto no cadastro/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Corrigir dados/i }));
    expect(mockCorrigir).toHaveBeenCalledWith(rifaComPendencia);
  });
});
