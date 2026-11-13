import { useState } from "react";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material";
import { normalizarTexto } from "@/shared/utils/formatadores";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";

import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades do componente de ações da auditoria de compras.
 */
export interface AuditoriaCompraActionsProps {
  /** Transação de compra exibida */
  compra: TransacaoTesouraria;
  /** Callback para visualização do arquivo de comprovante */
  onVerComprovante: (compra: TransacaoTesouraria) => void;
  /** Callback para edição dos dados cadastrais do comprador */
  onEditar: (compra: TransacaoTesouraria) => void;
  /** Callback para abertura do modal de detalhes completos */
  onVerDetalhes: (compra: TransacaoTesouraria) => void;
  /** Callback para reenvio do e-mail com os bilhetes e comprovante */
  onReenviarEmailComprovante: (compra: TransacaoTesouraria) => void;
  /** Indica se o e-mail desta compra está em processo de envio */
  reenviandoEmailComprovante?: boolean;
  /** Variante visual adaptada para tabela desktop compacta ou barra mobile */
  variante?: "desktop" | "mobile";
}

function ActionIcon({
  tooltip,
  label,
  icon,
  disabled = false,
  onClick,
}: {
  tooltip: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          sx={{
            color: colors.verdeEscuro,
            bgcolor: colors.verdeClaro,
            "&:hover": { bgcolor: colors.verdeHover },
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

/**
 * Renderiza as ações estritas de histórico da compra (Ver comprovante, Editar comprador,
 * Reenviar e-mail e Ver detalhes), adaptadas para tabela desktop (compacta com menu `...`)
 * ou barra de ações mobile com área de toque confortável (>= 36px).
 *
 * @param {AuditoriaCompraActionsProps} props - Propriedades do componente.
 * @returns {JSX.Element} Conjunto de botões ou barra de ações.
 */
export function AuditoriaCompraActions({
  compra,
  onVerComprovante,
  onEditar,
  onVerDetalhes,
  onReenviarEmailComprovante,
  reenviandoEmailComprovante = false,
  variante = "desktop",
}: AuditoriaCompraActionsProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const compraPaga = normalizarTexto(compra.status) === "pago";
  const possuiCompradorId = Boolean(compra.compradorId);
  const possuiEmail = Boolean(compra.compradorEmail?.trim());
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

  if (variante === "mobile") {
    return (
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ width: "100%" }}
      >
        {compra.comprovanteUrl && (
          <Button
            type="button"
            size="small"
            variant="outlined"
            aria-label="Ver comprovante"
            startIcon={<ImageOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => {
              e.stopPropagation();
              onVerComprovante(compra);
            }}
            sx={{
              minHeight: 36,
              px: 1.25,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.78rem",
              color: colors.verdeEscuro,
              borderColor: "rgba(6, 61, 49, 0.24)",
              bgcolor: colors.verdeClaro,
              "&:hover": {
                bgcolor: colors.verdeHover,
                borderColor: colors.verdeEscuro,
              },
            }}
          >
            Comprovante
          </Button>
        )}

        <Button
          type="button"
          size="small"
          variant="outlined"
          aria-label="Editar comprador"
          startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={(e) => {
            e.stopPropagation();
            onEditar(compra);
          }}
          sx={{
            minHeight: 36,
            px: 1.25,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 800,
            fontSize: "0.78rem",
            color: colors.verdeEscuro,
            borderColor: "rgba(6, 61, 49, 0.2)",
            bgcolor: colors.branco,
            "&:hover": {
              bgcolor: colors.verdeClaro,
              borderColor: colors.verdeEscuro,
            },
          }}
        >
          Editar
        </Button>

        <Tooltip title={tooltipEmail}>
          <span>
            <Button
              type="button"
              size="small"
              variant="outlined"
              aria-label="Reenviar e-mail"
              disabled={!podeReenviarEmail}
              startIcon={
                reenviandoEmailComprovante ? (
                  <CircularProgress size={14} sx={{ color: colors.verdeEscuro }} />
                ) : (
                  <EmailOutlinedIcon sx={{ fontSize: 16 }} />
                )
              }
              onClick={(e) => {
                e.stopPropagation();
                onReenviarEmailComprovante(compra);
              }}
              sx={{
                minHeight: 36,
                px: 1.25,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 800,
                fontSize: "0.78rem",
                color: colors.verdeEscuro,
                borderColor: "rgba(6, 61, 49, 0.2)",
                bgcolor: colors.branco,
                "&:hover": {
                  bgcolor: colors.verdeClaro,
                  borderColor: colors.verdeEscuro,
                },
              }}
            >
              E-mail
            </Button>
          </span>
        </Tooltip>

        <IconButton
          size="small"
          aria-label="Ver detalhes da compra"
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalhes(compra);
          }}
          sx={{
            ml: "auto",
            width: 36,
            height: 36,
            color: colors.cinzaTexto,
            bgcolor: colors.fundoSuave,
            "&:hover": {
              bgcolor: colors.verdeClaro,
              color: colors.verdeEscuro,
            },
          }}
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
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
        tooltip="Editar comprador"
        label="Editar comprador"
        icon={<EditOutlinedIcon fontSize="small" />}
        onClick={(e) => {
          e.stopPropagation();
          onEditar(compra);
        }}
      />

      <Tooltip title="Mais ações">
        <IconButton
          size="small"
          aria-label="Mais ações"
          aria-haspopup="menu"
          aria-expanded={Boolean(menuAnchor)}
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor(e.currentTarget);
          }}
          sx={{
            color: colors.verdeEscuro,
            bgcolor: colors.fundoSuave,
            "&:hover": { bgcolor: colors.verdeClaro },
          }}
        >
          {reenviandoEmailComprovante ? (
            <CircularProgress size={16} sx={{ color: colors.verdeEscuro }} />
          ) : (
            <MoreVertIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          disabled={!podeReenviarEmail}
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor(null);
            onReenviarEmailComprovante(compra);
          }}
        >
          <ListItemIcon>
            {reenviandoEmailComprovante ? (
              <CircularProgress size={16} sx={{ color: colors.verdeEscuro }} />
            ) : (
              <EmailOutlinedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary="Reenviar e-mail"
            secondary={!podeReenviarEmail ? tooltipEmail : undefined}
          />
        </MenuItem>

        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor(null);
            onVerDetalhes(compra);
          }}
        >
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Ver detalhes da compra" />
        </MenuItem>
      </Menu>
    </Stack>
  );
}
