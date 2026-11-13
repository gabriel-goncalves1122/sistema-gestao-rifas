import type { FormEventHandler, ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  Typography,
  type Breakpoint,
  type SxProps,
  type Theme,
} from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { typographyScale as typography } from "@/shared/tokens/typography";

/**
 * Propriedades do invólucro responsivo que alterna entre Drawer inferior (mobile) e Dialog modal (desktop).
 */
export interface ResponsiveDialogShellProps {
  /** Controla a visibilidade do modal ou drawer. */
  open: boolean;
  /** Callback acionado ao solicitar o fechamento. */
  onClose: () => void;
  /** Define se a interface deve adotar o layout de drawer inferior mobile. */
  isMobile: boolean;
  /** Título principal exibido no cabeçalho. */
  title: ReactNode;
  /** Subtítulo explicativo opcional exibido abaixo do título. */
  subtitle?: ReactNode;
  /** Identificador opcional associado ao título (`aria-labelledby`). */
  titleId?: string;
  /** Quando definido, exibe botão de fechar com este `aria-label`. */
  closeAriaLabel?: string;
  /** Desabilita o botão de fechar enquanto uma ação assíncrona ocorre. */
  closeDisabled?: boolean;
  /** Largura máxima do `Dialog` no desktop (padrão `"sm"`). */
  maxWidth?: Breakpoint;
  /** Área opcional de ações exibida no rodapé. */
  actions?: ReactNode;
  /** Conteúdo interno do modal/drawer. */
  children: ReactNode;
  /** Handler opcional de submissão quando o diálogo encapsula um `<form>`. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  /** Identificador opcional do `<form>` interno quando `onSubmit` é utilizado. */
  formId?: string;
  /** Estilos adicionais aplicados ao `DialogContent` no desktop. */
  contentSx?: SxProps<Theme>;
}

/**
 * Container responsivo reutilizável que renderiza um `Drawer` inferior com suporte a `safe-area`
 * em dispositivos móveis e um `Dialog` centralizado em telas maiores.
 *
 * @param {ResponsiveDialogShellProps} props - Configurações visuais, ações e conteúdo.
 * @returns {JSX.Element} Drawer mobile ou Dialog desktop padronizado.
 */
export function ResponsiveDialogShell({
  open,
  onClose,
  isMobile,
  title,
  subtitle,
  titleId,
  closeAriaLabel,
  closeDisabled = false,
  maxWidth = "sm",
  actions,
  children,
  onSubmit,
  formId,
  contentSx,
}: ResponsiveDialogShellProps) {
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            p: 2,
            bgcolor: colors.branco,
            maxHeight: "92dvh",
            pb: "max(16px, env(safe-area-inset-bottom))",
          },
        }}
      >
        <Stack
          component={onSubmit ? "form" : "div"}
          id={formId}
          onSubmit={onSubmit}
          spacing={2}
          sx={{ height: "100%", overflow: "hidden" }}
        >
          <Box
            sx={{
              width: 42,
              height: 4,
              borderRadius: 999,
              bgcolor: "rgba(2, 27, 22, 0.18)",
              mx: "auto",
            }}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 1.5,
            }}
          >
            <Box>
              <Typography sx={{ ...typography.titulo, fontSize: "1.2rem" }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  sx={{ color: colors.cinzaTexto, fontSize: "0.85rem", mt: 0.25 }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>

            {closeAriaLabel && (
              <IconButton
                aria-label={closeAriaLabel}
                onClick={onClose}
                disabled={closeDisabled}
                size="small"
                sx={{ color: colors.cinzaTexto }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", px: 0.25, pb: 1 }}>
            {children}
          </Box>

          {actions && (
            <Box sx={{ pt: 1.25, borderTop: `1px solid ${colors.borda}` }}>
              <Stack direction="row" spacing={1.5} sx={{ width: "100%" }}>
                {actions}
              </Stack>
            </Box>
          )}
        </Stack>
      </Drawer>
    );
  }

  const innerContent = (
    <>
      <DialogTitle
        id={titleId}
        sx={{
          ...surfaces.dialogTitle,
          pr: closeAriaLabel ? 6 : undefined,
        }}
      >
        {title}
        {subtitle && (
          <Typography
            sx={{ color: colors.cinzaTexto, fontSize: "0.88rem", mt: 0.45 }}
          >
            {subtitle}
          </Typography>
        )}
        {closeAriaLabel && (
          <IconButton
            aria-label={closeAriaLabel}
            onClick={onClose}
            disabled={closeDisabled}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              color: colors.cinzaTexto,
              borderRadius: 2,
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2.25, ...contentSx }}>{children}</DialogContent>

      {actions && (
        <DialogActions sx={surfaces.dialogActions}>{actions}</DialogActions>
      )}
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby={titleId}
      PaperProps={{
        sx: surfaces.dialog,
      }}
    >
      {onSubmit ? (
        <form id={formId} onSubmit={onSubmit}>
          {innerContent}
        </form>
      ) : (
        innerContent
      )}
    </Dialog>
  );
}
