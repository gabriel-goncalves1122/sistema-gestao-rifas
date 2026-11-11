import { Box, Button, Stack } from "@mui/material";

import { usePaginacaoProgressiva } from "@/shared/hooks/usePaginacaoProgressiva";
import { colors } from "@/shared/tokens/colors";
import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import { AuditoriaCompraCard } from "./AuditoriaCompraCard";

const ITENS_POR_LOTE_MOBILE = 20;

/**
 * Propriedades para renderização da lista progressiva de cartões mobile de auditoria.
 */
export interface AuditoriaComprasCardListProps {
  /** Lista filtrada de compras */
  compras: TransacaoTesouraria[];
  /** Callback para visualizar comprovante */
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  /** Callback para editar dados do comprador */
  onEditar: (compra: TransacaoTesouraria) => void;
  /** Callback para abrir detalhes da compra */
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  /** Callback para reenviar e-mail de comprovante */
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  /** ID do comprador em processo de reenvio de e-mail */
  reenviandoEmailComprovanteId?: string | null;
  /** Callback para aprovar compra pendente */
  onAceitar?: (compra: TransacaoTesouraria) => void;
  /** Callback para recusar compra pendente */
  onNegar?: (compra: TransacaoTesouraria) => void;
  /** ID da transação em processamento */
  processandoAcaoId?: string | null;
}

/**
 * Lista de cartões mobile com renderização progressiva em lotes de 20 itens,
 * evitando travamentos na montagem de centenas de transações.
 *
 * @param {AuditoriaComprasCardListProps} props - Propriedades da lista.
 * @returns {JSX.Element} Pilha de cartões com carregamento incremental.
 */
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
  const {
    itensVisiveis: comprasVisiveis,
    restantes,
    sentinelaRef,
    carregarMais,
  } = usePaginacaoProgressiva(compras, ITENS_POR_LOTE_MOBILE);

  return (
    <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" } }}>
      {comprasVisiveis.map((compra) => (
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

      {restantes > 0 && (
        <Box ref={sentinelaRef} sx={{ pt: 0.5, textAlign: "center" }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={carregarMais}
            sx={{
              borderRadius: 2,
              fontWeight: 850,
              textTransform: "none",
              color: colors.verdeEscuro,
              borderColor: "rgba(6, 61, 49, 0.24)",
              py: 1,
            }}
          >
            Mostrar mais ({restantes} restante{restantes > 1 ? "s" : ""})
          </Button>
        </Box>
      )}
    </Stack>
  );
}
