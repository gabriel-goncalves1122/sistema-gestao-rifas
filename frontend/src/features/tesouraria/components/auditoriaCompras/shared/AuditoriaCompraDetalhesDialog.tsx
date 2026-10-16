import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import {
  formatarDataAuditoria,
  formatarMoedaAuditoria,
  statusLabelAuditoria,
  origemLabelAuditoria,
} from "../../../utils/auditoriaComprasUtils";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { layout } from "../../../styles/layout";
import { useTesourariaLayout } from "../../../hooks/useTesourariaLayout";

/**
 * Propriedades para renderização do diálogo/drawer com os detalhes completos da compra auditada.
 */
export interface AuditoriaCompraDetalhesDialogProps {
  /** Transação inspecionada ou `null` se fechado */
  compra: TransacaoTesouraria | null;
  /** Callback para fechamento do modal */
  onClose: () => void;
}

/**
 * Modal adaptativo (Dialog no desktop e BottomDrawer no mobile) com todos os detalhes
 * e conciliações financeiras da transação de compra selecionada.
 *
 * @param {AuditoriaCompraDetalhesDialogProps} props - Propriedades do componente.
 * @returns {JSX.Element} Modal/Drawer com dados detalhados.
 */
export function AuditoriaCompraDetalhesDialog({
  compra,
  onClose,
}: AuditoriaCompraDetalhesDialogProps) {
  const { isMobile } = useTesourariaLayout();

  const conteudoDetalhes = compra && (
    <Stack spacing={2.25}>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {compra.bilhetes.map((bilhete) => (
          <Chip
            key={bilhete}
            label={`Rifa ${bilhete}`}
            sx={components.chipBilhete}
          />
        ))}
      </Stack>

      <Box sx={layout.gridDois}>
        <TextField
          label="Comprador ID"
          value={compra.compradorId || "Sem compradorId"}
          size="small"
          disabled
        />
        <TextField
          label="Status"
          value={statusLabelAuditoria(compra.status)}
          size="small"
          disabled
        />
        <TextField
          label="Canal / Origem"
          value={origemLabelAuditoria(compra.origem)}
          size="small"
          disabled
        />
        <TextField
          label="Correção pendente"
          value={compra.correcaoPendente ? "Sim" : "Não"}
          size="small"
          disabled
        />
        <TextField
          label="Valor nominal bruto"
          value={formatarMoedaAuditoria(compra.valorTotal)}
          size="small"
          disabled
        />
        <TextField
          label="Valor líquido arrecadado"
          value={formatarMoedaAuditoria(compra.valorLiquido ?? compra.valorTotal)}
          size="small"
          disabled
        />
        <TextField
          label="ID Pedido Pix (Gateway)"
          value={compra.pixOrderId || "Não aplicável"}
          size="small"
          disabled
        />
        <TextField
          label="Status bancário"
          value={compra.statusPagamentoBanco || "Não aplicável"}
          size="small"
          disabled
        />
        <TextField
          label="Vendedor"
          value={compra.vendedorNome}
          size="small"
          disabled
        />
        <TextField
          label="CPF do vendedor"
          value={compra.vendedorCpf}
          size="small"
          disabled
        />
        <TextField
          label="Data da reserva"
          value={formatarDataAuditoria(compra.dataReserva)}
          size="small"
          disabled
        />
        <TextField
          label="Data do pagamento"
          value={formatarDataAuditoria(compra.dataPagamento)}
          size="small"
          disabled
        />
      </Box>
    </Stack>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={Boolean(compra)}
        onClose={onClose}
        PaperProps={{
          sx: layout.drawerPaper,
        }}
      >
        {compra && (
          <Stack spacing={2} sx={{ pb: 2 }}>
            <Box sx={layout.drawerPullHandle} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography sx={{ ...typography.titulo, fontSize: "1.2rem" }}>
                  Detalhes da compra
                </Typography>
                <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.85rem", mt: 0.2 }}>
                  Conferência de vínculos, bilhetes e dados protegidos.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", px: 0.5, pb: 1 }}>
              {conteudoDetalhes}
            </Box>
            <Box sx={{ pt: 1, borderTop: `1px solid ${colors.borda}` }}>
              <Button
                fullWidth
                onClick={onClose}
                sx={components.botaoSecundario}
              >
                Fechar
              </Button>
            </Box>
          </Stack>
        )}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={Boolean(compra)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: surfaces.dialog,
      }}
    >
      <DialogTitle sx={surfaces.dialogTitle}>
        Detalhes da compra
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.88rem", mt: 0.45 }}>
          Conferência de vínculos, bilhetes e dados protegidos.
        </Typography>
      </DialogTitle>
      {compra && (
        <DialogContent sx={{ pt: 2.75 }}>
          {conteudoDetalhes}
        </DialogContent>
      )}
      <DialogActions sx={surfaces.dialogActions}>
        <Button
          onClick={onClose}
          sx={components.botaoSecundario}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
