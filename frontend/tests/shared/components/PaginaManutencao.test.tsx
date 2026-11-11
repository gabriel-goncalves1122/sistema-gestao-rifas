import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaginaManutencao } from "@/shared/components/PaginaManutencao";

describe("PaginaManutencao", () => {
  it("deve renderizar a mensagem padrão quando nenhuma for informada", () => {
    render(<PaginaManutencao />);

    expect(screen.getByText("Manutenção Programada")).toBeInTheDocument();
    expect(
      screen.getByText(/Estamos realizando uma manutenção programada/i),
    ).toBeInTheDocument();
  });

  it("deve renderizar a mensagem customizada e o chip de previsão de retorno", () => {
    render(
      <PaginaManutencao
        mensagem="Atualização de servidores."
        previsaoRetorno="Hoje às 23h00"
      />,
    );

    expect(screen.getByText("Atualização de servidores.")).toBeInTheDocument();
    expect(
      screen.getByText("Previsão de retorno: Hoje às 23h00"),
    ).toBeInTheDocument();
  });

  it("deve chamar onTentarNovamente ao clicar no botão recarregar", () => {
    const handleRecarregar = vi.fn();
    render(<PaginaManutencao onTentarNovamente={handleRecarregar} />);

    const botao = screen.getByRole("button", { name: /Verificar Novamente/i });
    fireEvent.click(botao);

    expect(handleRecarregar).toHaveBeenCalledTimes(1);
  });

  it("deve exibir botão de sair da conta quando autenticado e acionar callback", () => {
    const handleSair = vi.fn();
    render(
      <PaginaManutencao estaAutenticado={true} onSair={handleSair} />,
    );

    const botaoSair = screen.getByRole("button", { name: /Sair da Conta/i });
    expect(botaoSair).toBeInTheDocument();

    fireEvent.click(botaoSair);
    expect(handleSair).toHaveBeenCalledTimes(1);
  });

  it("deve exibir link de acesso administrativo e acionar callback", () => {
    const handleAcessoAdmin = vi.fn();
    render(<PaginaManutencao onAcessoAdmin={handleAcessoAdmin} />);

    const botaoAdmin = screen.getByRole("button", {
      name: /Acesso Administrativo/i,
    });
    expect(botaoAdmin).toBeInTheDocument();

    fireEvent.click(botaoAdmin);
    expect(handleAcessoAdmin).toHaveBeenCalledTimes(1);
  });
});
