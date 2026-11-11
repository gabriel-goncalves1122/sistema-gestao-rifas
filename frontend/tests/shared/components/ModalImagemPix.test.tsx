import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ModalImagemPix } from "@/shared/components/ModalImagemPix";

describe("Componente <ModalImagemPix />", () => {
  const mockOnClose = vi.fn();

  it("Não deve renderizar a imagem se a URL for null", () => {
    render(<ModalImagemPix url={null} onClose={mockOnClose} />);
    expect(
      screen.queryByRole("img", { name: "Comprovante Pix" }),
    ).not.toBeInTheDocument();
  });

  it("Deve renderizar a imagem e fechar ao clicar no X", () => {
    render(
      <ModalImagemPix url="http://meusite.com/pix.jpg" onClose={mockOnClose} />,
    );

    const imagem = screen.getByRole("img", { name: "Comprovante Pix" });
    expect(imagem).toBeInTheDocument();
    expect(imagem).toHaveAttribute("src", "http://meusite.com/pix.jpg");

    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("Deve renderizar iframe e link em nova aba quando a URL for um PDF", () => {
    render(
      <ModalImagemPix
        url="https://storage.googleapis.com/meu-bucket/comprovante.pdf?token=123"
        onClose={mockOnClose}
      />,
    );

    const iframe = screen.getByTitle("Comprovante Pix");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://storage.googleapis.com/meu-bucket/comprovante.pdf?token=123",
    );

    const linkNovaAba = screen.getByRole("link", {
      name: /Abrir PDF em nova aba/i,
    });
    expect(linkNovaAba).toBeInTheDocument();
    expect(linkNovaAba).toHaveAttribute("target", "_blank");
  });
});
