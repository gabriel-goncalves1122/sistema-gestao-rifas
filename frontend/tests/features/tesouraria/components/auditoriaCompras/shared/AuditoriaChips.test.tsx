import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuditoriaOrigemChip } from "@/features/tesouraria/components/auditoriaCompras/shared/AuditoriaOrigemChip";
import { AuditoriaCorrecaoChip } from "@/features/tesouraria/components/auditoriaCompras/shared/AuditoriaCorrecaoChip";

describe("Componentes dumb: AuditoriaChips", () => {
  it("AuditoriaOrigemChip deve renderizar Pix para canal PIX", () => {
    render(<AuditoriaOrigemChip origem="PIX" />);
    expect(screen.getByText("Pix")).toBeInTheDocument();
  });

  it("AuditoriaOrigemChip deve renderizar Comprovante para outros canais", () => {
    render(<AuditoriaOrigemChip origem="COMPROVANTE" />);
    expect(screen.getByText("Comprovante")).toBeInTheDocument();
  });

  it("AuditoriaCorrecaoChip deve renderizar quando pendente for true", () => {
    render(<AuditoriaCorrecaoChip pendente={true} />);
    expect(screen.getByText("Correção pendente")).toBeInTheDocument();
  });

  it("AuditoriaCorrecaoChip não deve renderizar quando pendente for false ou indefinido", () => {
    const { container } = render(<AuditoriaCorrecaoChip pendente={false} />);
    expect(container.firstChild).toBeNull();
  });
});
