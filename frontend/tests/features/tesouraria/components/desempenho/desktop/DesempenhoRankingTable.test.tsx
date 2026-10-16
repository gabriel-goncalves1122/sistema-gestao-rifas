import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DesempenhoRankingTable } from "@/features/tesouraria/components/desempenho/desktop/DesempenhoRankingTable";
import { AderidoRankingDesempenho } from "@/features/tesouraria/types/desempenho";

describe("Componente: DesempenhoRankingTable", () => {
  it("Deve renderizar aderidos classificados e seus splits de canais", () => {
    const ranking: AderidoRankingDesempenho[] = [
      {
        id: "aderido_1",
        nome: "Aluno Campeão",
        cpf: "123.456.789-00",
        curso: "Eng. Mecânica",
        cargo: "Tesoureiro",
        arrecadado: 1200,
        arrecadadoLiquido: 1190,
        meta: 1200,
        rifasVendidas: 120,
        rifasVendidasPix: 100,
        rifasVendidasComprovante: 20,
        rifasPendentes: 0,
        posicao: 1,
        percentualMeta: 100,
        bateuMeta: true,
      },
    ];

    render(<DesempenhoRankingTable ranking={ranking} />);

    expect(screen.getByText("Aluno Campeão")).toBeInTheDocument();
    expect(screen.getByText("Eng. Mecânica")).toBeInTheDocument();
    expect(screen.getByText("Tesoureiro")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // Pix
    expect(screen.getByText("20")).toBeInTheDocument(); // Comp
    expect(screen.getByText("120")).toBeInTheDocument(); // Total
    expect(screen.getByText("100% da meta")).toBeInTheDocument();
    expect(screen.getByText("✓ Atingida")).toBeInTheDocument();
  });

  it("Deve exibir estado vazio quando o ranking for vazio", () => {
    render(<DesempenhoRankingTable ranking={[]} />);

    expect(
      screen.getByText(/Nenhum aderido encontrado/i),
    ).toBeInTheDocument();
  });
});
