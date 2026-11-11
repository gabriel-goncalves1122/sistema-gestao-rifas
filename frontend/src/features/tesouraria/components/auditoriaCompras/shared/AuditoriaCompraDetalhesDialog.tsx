import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import {
  formatarDataAuditoria,
  formatarMoedaAuditoria,
} from "../../../utils/auditoriaComprasUtils";
import { AuditoriaStatusChip } from "./AuditoriaStatusChip";
import { AuditoriaOrigemChip } from "./AuditoriaOrigemChip";
import { AuditoriaCorrecaoChip } from "./AuditoriaCorrecaoChip";
import { formatarTelefone } from "@/shared/utils/formatadores";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { layout } from "../../../styles/layout";
import { useTesourariaLayout } from "../../../hooks/useTesourariaLayout";

/**
 * Propriedades para renderização do diálogo/drawer com os detalhes da compra auditada.
 */
export interface AuditoriaCompraDetalhesDialogProps {
  /** Transação inspecionada ou `null` se fechado */
  compra: TransacaoTesouraria | null;
  /** Callback para fechamento do modal */
  onClose: () => void;
  /** Callback opcional para abrir a visualização do comprovante */
  onVerComprovante?: (compra: TransacaoTesouraria) => void;
}

function CampoDetalhe({
  label,
  valor,
}: {
  label: string;
  valor?: string | number | null;
}) {
  return (
    <Box sx={surfaces.cartaoInfo}>
      <Typography sx={typography.label}>{label}</Typography>
      <Typography
        sx={{
          ...typography.bodyDestaque,
          fontSize: "0.92rem",
          mt: 0.35,
          overflowWrap: "anywhere",
        }}
      >
        {valor || "Não informado"}
      </Typography>
    </Box>
  );
}

/**
 * Modal adaptativo (Dialog no desktop e BottomDrawer no mobile) com layout limpo em cards
 * apresentando os dados essenciais do comprador, vendedor, datas e bilhetes vinculados.
 *
 * @param {AuditoriaCompraDetalhesDialogProps} props - Propriedades do componente.
 * @returns {JSX.Element} Modal/Drawer com dados detalhados.
 */
export function AuditoriaCompraDetalhesDialog({
  compra,
  onClose,
  onVerComprovante,
}: AuditoriaCompraDetalhesDialogProps) {
  const { isMobile } = useTesourariaLayout();

  const txidIdentificador = compra
    ? compra.pixOrderId ||
      (compra.id.startsWith("pix-") ? compra.id.replace("pix-", "") : null)
    : null;

  const conteudoDetalhes = compra && (
    <Stack spacing={2}>
      {/* Banner Resumo da Compra */}
      <Box
        sx={{
          ...surfaces.fundoVerdeClaro,
          p: 1.75,
          borderRadius: 2.25,
          border: "1px solid rgba(6, 61, 49, 0.14)",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                color: colors.pretoEsverdeado,
                fontWeight: 950,
                fontSize: "1.08rem",
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {compra.compradorNome}
            </Typography>
            <Stack
              direction="row"
              spacing={0.6}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 1 }}
            >
              <AuditoriaStatusChip status={compra.status} />
              <AuditoriaOrigemChip origem={compra.origem} />
              <AuditoriaCorrecaoChip pendente={compra.correcaoPendente} />
            </Stack>
          </Box>

          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography
              sx={{
                color: colors.verdeEscuro,
                fontWeight: 950,
                fontSize: "1.32rem",
                lineHeight: 1.1,
              }}
            >
              {formatarMoedaAuditoria(compra.valorTotal)}
            </Typography>
            <Typography
              sx={{
                color: colors.cinzaTexto,
                fontSize: "0.78rem",
                fontWeight: 800,
                mt: 0.35,
              }}
            >
              {compra.bilhetes.length} rifa(s)
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Ação de Comprovante Anexado */}
      {compra.comprovanteUrl && (
        <Box sx={surfaces.cartaoInfo}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <DescriptionOutlinedIcon sx={{ color: colors.verdeForte }} />
              <Box>
                <Typography sx={typography.label}>Comprovante Anexado</Typography>
                <Typography variant="caption" sx={{ color: colors.cinzaTexto }}>
                  Arquivo disponível para auditoria e conferência
                </Typography>
              </Box>
            </Stack>

            {onVerComprovante && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => onVerComprovante(compra)}
                sx={{
                  borderRadius: 2,
                  borderColor: colors.verdeForte,
                  color: colors.verdeForte,
                  fontWeight: 800,
                  textTransform: "none",
                  "&:hover": { bgcolor: "rgba(11, 122, 97, 0.08)" },
                }}
              >
                Ver Comprovante
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {/* Grid de Informações Essenciais */}
      <Box sx={layout.gridDois}>
        <CampoDetalhe
          label="E-mail do comprador"
          valor={compra.compradorEmail || "Não informado"}
        />
        <CampoDetalhe
          label="Telefone do comprador"
          valor={
            compra.compradorTelefone
              ? formatarTelefone(compra.compradorTelefone)
              : "Não informado"
          }
        />
        <CampoDetalhe
          label="Vendedor responsável"
          valor={compra.vendedorNome}
        />
        <CampoDetalhe
          label="CPF do vendedor"
          valor={compra.vendedorCpf || "Não informado"}
        />
        <CampoDetalhe
          label="Data da reserva"
          valor={formatarDataAuditoria(compra.dataReserva)}
        />
        <CampoDetalhe
          label="Data do pagamento"
          valor={formatarDataAuditoria(compra.dataPagamento)}
        />
        {txidIdentificador && (
          <CampoDetalhe
            label="Identificador Pix (txid)"
            valor={txidIdentificador}
          />
        )}
      </Box>

      {/* Rifas Vinculadas */}
      <Box sx={surfaces.cartaoInfo}>
        <Typography sx={{ ...typography.label, mb: 1 }}>
          Rifas vinculadas ({compra.bilhetes.length})
        </Typography>
        <Stack direction="row" spacing={0.65} flexWrap="wrap" useFlexGap>
          {compra.bilhetes.map((bilhete) => (
            <Chip
              key={bilhete}
              label={`Rifa ${bilhete}`}
              size="small"
              sx={components.chipBilhete}
            />
          ))}
        </Stack>
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography sx={{ ...typography.titulo, fontSize: "1.18rem" }}>
                Detalhes da compra
              </Typography>
              <IconButton
                aria-label="Fechar detalhes da compra"
                onClick={onClose}
                size="small"
                sx={{ color: colors.cinzaTexto }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", px: 0.25, pb: 1 }}>
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
      <DialogTitle sx={{ ...surfaces.dialogTitle, pr: 6 }}>
        Detalhes da compra
        <IconButton
          aria-label="Fechar detalhes da compra"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            color: colors.cinzaTexto,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      {compra && (
        <DialogContent sx={{ pt: 2.25 }}>{conteudoDetalhes}</DialogContent>
      )}
      <DialogActions sx={surfaces.dialogActions}>
        <Button onClick={onClose} sx={components.botaoSecundario}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
