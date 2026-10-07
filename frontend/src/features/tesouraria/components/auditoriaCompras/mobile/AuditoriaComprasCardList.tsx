import { Stack } from "@mui/material";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import { AuditoriaCompraCard } from "./AuditoriaCompraCard";

interface AuditoriaComprasCardListProps {
  compras: TransacaoTesouraria[];
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  onEditar: (compra: TransacaoTesouraria) => void;
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  reenviandoEmailComprovanteId?: string | null;
  onAceitar?: (compra: TransacaoTesouraria) => void;
  onNegar?: (compra: TransacaoTesouraria) => void;
  processandoAcaoId?: string | null;
}

export function AuditoriaComprasCardList({
  compras,
  onVerComprovante,
  onEditar,
  onVerDetalhes,
  onReenviarEmailComprovante,
  reenviandoEmailComprovanteId,
  onAceitar,
  onNegar,
  processandoAcaoId,
}: AuditoriaComprasCardListProps) {
  return (
    <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
      {compras.map((compra) => (
        <AuditoriaCompraCard
          key={compra.id}
          compra={compra}
          onVerComprovante={onVerComprovante}
          onEditar={onEditar}
          onVerDetalhes={onVerDetalhes}
          onReenviarEmailComprovante={onReenviarEmailComprovante}
          reenviandoEmailComprovante={
            Boolean(compra.compradorId) &&
            compra.compradorId === reenviandoEmailComprovanteId
          }
          onAceitar={onAceitar}
          onNegar={onNegar}
          processandoAcaoId={processandoAcaoId}
        />
      ))}
    </Stack>
  );
}
