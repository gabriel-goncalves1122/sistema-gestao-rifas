// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/ModalDetalhesRifa.tsx
// ============================================================================
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import AlternateEmailOutlinedIcon from "@mui/icons-material/AlternateEmailOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import ReportGmailerrorredIcon from "@mui/icons-material/ReportGmailerrorred";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";

import { RifaAderido } from "./types/painelAderido";
import { formatarData, formatarTelefone } from "@/shared/utils/formatadores";
import { DetalheRifaItem } from "./components/detalhesRifa/DetalheRifaItem";
import { StatusRifaDetalhe } from "./components/detalhesRifa/StatusRifaDetalhe";

interface ModalDetalhesRifaProps {
  open: boolean;
  onClose: () => void;
  rifa: RifaAderido | null;
  onCorrigirDados?: (rifa: RifaAderido) => void;
}

export function ModalDetalhesRifa({
  open,
  onClose,
  rifa,
  onCorrigirDados,
}: ModalDetalhesRifaProps) {
  if (!rifa) return null;

  const temCorrecaoPendente = rifa.correcao_pendente === true;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: "#F9FAF9",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
        },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #0A4A3B 0%, #063D31 100%)",
          pt: 3,
          pb: 2,
          px: 3,
          position: "relative",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
              }}
            >
              <ConfirmationNumberOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase" }}>
                Rifa
              </Typography>
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 900, lineHeight: 1 }}>
                #{rifa.numero}
              </Typography>
            </Box>
          </Stack>
          
          <StatusRifaDetalhe status={rifa.status} />
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {temCorrecaoPendente && (
            <Box
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                bgcolor: "#FFF4D8",
                border: "1px solid #CBA64D",
              }}
            >
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <ReportGmailerrorredIcon
                    fontSize="small"
                    sx={{ color: "#8A5300", mt: 0.15 }}
                  />
                  <Box>
                    <Typography
                      sx={{
                        color: "#8A5300",
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Correção de cadastro solicitada
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.35,
                        color: "#5C3700",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        lineHeight: 1.35,
                      }}
                    >
                      {rifa.motivo_recusa ||
                        "A tesouraria solicitou a revisão dos dados do comprador."}
                    </Typography>
                  </Box>
                </Stack>

                {onCorrigirDados && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<BuildCircleIcon />}
                    onClick={() => onCorrigirDados(rifa)}
                    sx={{
                      alignSelf: "flex-start",
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 800,
                      bgcolor: "#8A5300",
                      "&:hover": {
                        bgcolor: "#6B4000",
                      },
                    }}
                  >
                    Corrigir dados
                  </Button>
                )}
              </Stack>
            </Box>
          )}

          {/* BLOCO: Comprador */}
          <Box>
            <Typography variant="overline" sx={{ color: "#8E9E98", fontWeight: 800, mb: 1, display: "block" }}>
              Identidade
            </Typography>
            <Box sx={{ p: 2, bgcolor: "#FFF", borderRadius: 3, border: "1px solid rgba(6, 61, 49, 0.08)" }}>
              <DetalheRifaItem
                label="Comprador"
                value={rifa.comprador_nome}
                icon={<PersonOutlineOutlinedIcon />}
              />
            </Box>
          </Box>

          {/* BLOCO: Contato */}
          <Box>
            <Typography variant="overline" sx={{ color: "#8E9E98", fontWeight: 800, mb: 1, display: "block" }}>
              Contato
            </Typography>
            <Box sx={{ p: 2, bgcolor: "#FFF", borderRadius: 3, border: "1px solid rgba(6, 61, 49, 0.08)" }}>
              <Stack spacing={1}>
                <DetalheRifaItem
                  label="Telefone / WhatsApp"
                  value={formatarTelefone(rifa.comprador_telefone)}
                  icon={<PhoneOutlinedIcon />}
                />
                <Divider sx={{ my: 1, borderColor: "rgba(6, 61, 49, 0.04)" }} />
                <DetalheRifaItem
                  label="E-mail"
                  value={rifa.comprador_email}
                  icon={<AlternateEmailOutlinedIcon />}
                />
              </Stack>
            </Box>
          </Box>

          {/* BLOCO: Linha do Tempo */}
          <Box>
            <Typography variant="overline" sx={{ color: "#8E9E98", fontWeight: 800, mb: 1, display: "block" }}>
              Linha do Tempo
            </Typography>
            <Box sx={{ p: 2, bgcolor: "#FFF", borderRadius: 3, border: "1px solid rgba(6, 61, 49, 0.08)" }}>
              <Stack spacing={1}>
                <DetalheRifaItem
                  label="Reserva iniciada em"
                  value={formatarData(rifa.data_reserva)}
                  icon={<CalendarMonthOutlinedIcon />}
                />
                {rifa.data_pagamento && (
                  <>
                    <Divider sx={{ my: 1, borderColor: "rgba(6, 61, 49, 0.04)" }} />
                    <DetalheRifaItem
                      label="Confirmada em"
                      value={formatarData(rifa.data_pagamento)}
                      icon={<EventAvailableOutlinedIcon />}
                    />
                  </>
                )}
              </Stack>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, bgcolor: "#FFF", borderTop: "1px solid rgba(6, 61, 49, 0.05)" }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          size="large"
          sx={{
            borderRadius: 2.5,
            fontWeight: 800,
            textTransform: "none",
            bgcolor: "#063D31",
            "&:hover": {
              bgcolor: "#0A4A3B",
            },
            "&:focus-visible": {
              outline: "4px solid rgba(6, 61, 49, 0.24)",
              outlineOffset: "2px",
            },
          }}
        >
          Sair
        </Button>
      </DialogActions>
    </Dialog>
  );
}
