import { useState, MouseEvent } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Box, Chip, IconButton, Popover, Stack, Typography, Tooltip } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import { StatusValidacaoUI } from "@/types/pixTransacoes";
import {
  PIX_VALIDACAO_VISUAL,
  obterVisualStatusValidacaoUI,
} from "./pixValidacaoUtils";

const STATUS_LEGENDA: StatusValidacaoUI[] = [
  "pendente_validacao",
  "aceita",
  "negada",
  "sem_confirmacao_bancaria",
];

export function PixStatusLegenda() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "legenda-popover" : undefined;

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
      <Tooltip title="Entenda os status de validação">
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          size="small"
          sx={{ color: colors.cinzaTexto }}
        >
          <HelpOutlineIcon fontSize="small" />
          <Typography sx={{ ml: 0.5, fontSize: "0.8rem", fontWeight: 700 }}>Legenda</Typography>
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: { p: 2, borderRadius: 2, maxWidth: 300 },
          },
        }}
      >
        <Typography sx={{ fontWeight: 850, mb: 1.5, color: colors.pretoEsverdeado }}>
          Legenda de status
        </Typography>
        <Stack spacing={1}>
          {STATUS_LEGENDA.map((status) => {
            const visual = obterVisualStatusValidacaoUI(status);

            return (
              <Chip
                key={status}
                label={`${visual.label}: ${visual.descricao}`}
                size="small"
                sx={{
                  height: "auto",
                  minHeight: 30,
                  borderRadius: 2,
                  color: visual.color,
                  bgcolor: visual.bgcolor,
                  border: visual.border,
                  fontWeight: 800,
                  justifyContent: "flex-start",
                  "& .MuiChip-label": {
                    whiteSpace: "normal",
                    py: 0.75,
                  },
                }}
              />
            );
          })}
        </Stack>
      </Popover>
    </Box>
  );
}

export const pixStatusLegendaLabels = PIX_VALIDACAO_VISUAL;
