import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { CircularProgress, IconButton, Stack, Tooltip } from "@mui/material";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import { normalizarTexto } from "../../../utils/auditoriaComprasUtils";
import { colors } from "@/shared/tokens/colors";

interface AuditoriaCompraActionsProps {
  compra: TransacaoTesouraria;
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  onEditar: (compra: TransacaoTesouraria) => void;
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  reenviandoEmailComprovante?: boolean;
  onAceitar?: (compra: TransacaoTesouraria) => void;
  onNegar?: (compra: TransacaoTesouraria) => void;
  processandoAcaoId?: string | null;
}

type ActionIconVariant = "default" | "success" | "warning" | "danger";

const ACTION_VARIANT_STYLES: Record<
  ActionIconVariant,
  { color: string; bgcolor: string; hoverBg: string }
> = {
  default: {
    color: colors.verdeEscuro,
    bgcolor: colors.verdeClaro,
    hoverBg: colors.verdeHover,
  },
  success: {
    color: "#0B5136",
    bgcolor: "#D8EFE4",
    hoverBg: "#BEE5D2",
  },
  warning: {
    color: "#8A5300",
    bgcolor: "#FFF4D8",
    hoverBg: "#FFE9AD",
  },
  danger: {
    color: colors.erroTexto,
    bgcolor: colors.erroSuave,
    hoverBg: "#F5C2C2",
  },
};

function ActionIcon({
  tooltip,
  label,
  icon,
  disabled = false,
  variant = "default",
  onClick,
}: {
  tooltip: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  variant?: ActionIconVariant;
  onClick: (e: React.MouseEvent) => void;
}) {
  const palette = ACTION_VARIANT_STYLES[variant];

  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          sx={{
            color: palette.color,
            bgcolor: palette.bgcolor,
            "&:hover": { bgcolor: palette.hoverBg },
            "&.Mui-disabled": {
              bgcolor: colors.fundoSuave,
              color: colors.cinzaDisabled,
            },
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function AuditoriaCompraActions({
  compra,
  onVerComprovante,
  onEditar,
  onVerDetalhes,
  onReenviarEmailComprovante,
  reenviandoEmailComprovante = false,
  onAceitar,
  onNegar,
  processandoAcaoId = null,
}: AuditoriaCompraActionsProps) {
  const compraPaga = normalizarTexto(compra.status) === "pago";
  const possuiCompradorId = Boolean(compra.compradorId);
  const possuiEmail = Boolean(compra.compradorEmail.trim());
  const podeReenviarEmail =
    compraPaga &&
    possuiCompradorId &&
    possuiEmail &&
    !reenviandoEmailComprovante;
  const tooltipEmail = reenviandoEmailComprovante
    ? "Reenviando e-mail de comprovante"
    : !compraPaga
      ? "Disponível somente para compras pagas"
      : !possuiCompradorId
        ? "Compra sem compradorId"
        : !possuiEmail
          ? "Compra sem e-mail do comprador"
          : "Reenviar e-mail de comprovante";

  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      {compra.comprovanteUrl && (
        <ActionIcon
          tooltip="Ver comprovante"
          label="Ver comprovante"
          icon={<ImageOutlinedIcon fontSize="small" />}
          onClick={(e) => {
            e.stopPropagation();
            onVerComprovante(compra);
          }}
        />
      )}

      <ActionIcon
        tooltip={tooltipEmail}
        label="Reenviar e-mail"
        disabled={!podeReenviarEmail}
        icon={
          reenviandoEmailComprovante ? (
            <CircularProgress size={16} sx={{ color: colors.verdeEscuro }} />
          ) : (
            <EmailOutlinedIcon fontSize="small" />
          )
        }
        onClick={(e) => {
          e.stopPropagation();
          onReenviarEmailComprovante(compra);
        }}
      />

      <ActionIcon
        tooltip="Editar comprador"
        label="Editar comprador"
        icon={<EditOutlinedIcon fontSize="small" />}
        onClick={(e) => {
          e.stopPropagation();
          onEditar(compra);
        }}
      />

      <ActionIcon
        tooltip="Ver detalhes da compra"
        label="Ver detalhes da compra"
        icon={<VisibilityOutlinedIcon fontSize="small" />}
        onClick={(e) => {
          e.stopPropagation();
          onVerDetalhes(compra);
        }}
      />

      {onAceitar && (compra.status === "pendente" || compra.status === "reservado") && (
        <ActionIcon
          tooltip="Aprovar compra"
          label="Aprovar compra"
          variant="success"
          disabled={processandoAcaoId === compra.id}
          icon={
            processandoAcaoId === compra.id ? (
              <CircularProgress size={16} sx={{ color: "#0B5136" }} />
            ) : (
              <CheckCircleOutlinedIcon fontSize="small" />
            )
          }
          onClick={(e) => {
            e.stopPropagation();
            onAceitar(compra);
          }}
        />
      )}

      {onNegar && (compra.status === "pendente" || compra.status === "reservado") && (
        <ActionIcon
          tooltip="Recusar compra"
          label="Recusar compra"
          variant="danger"
          disabled={processandoAcaoId === compra.id}
          icon={
            processandoAcaoId === compra.id ? (
              <CircularProgress size={16} sx={{ color: colors.erroTexto }} />
            ) : (
              <CancelOutlinedIcon fontSize="small" />
            )
          }
          onClick={(e) => {
            e.stopPropagation();
            onNegar(compra);
          }}
        />
      )}
    </Stack>
  );
}
