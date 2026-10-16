// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/CarrinhoFlutuante.tsx
// ============================================================================
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

import { useKeyboardHeight } from "@/shared/hooks/useKeyboardHeight";
import { painelAderidoStyles } from "./styles/painelAderidoStyles";
import { formatarMoeda } from "@/shared/utils/formatadores";

interface CarrinhoFlutuanteProps {
  quantidade: number;
  valorTotal: number;
  onVenderClick: () => void;
  numerosSelecionados?: string[];
  onLimparClick?: () => void;
}

function formatarResumoNumeros(numeros?: string[]): string | null {
  if (!numeros || numeros.length === 0) return null;
  const limite = 4;
  const visiveis = numeros.slice(0, limite).map((n) => `#${n}`).join(", ");
  const restantes = numeros.length - limite;
  return restantes > 0 ? `${visiveis} +${restantes}` : visiveis;
}

export function CarrinhoFlutuante({
  quantidade,
  valorTotal,
  onVenderClick,
  numerosSelecionados,
  onLimparClick,
}: CarrinhoFlutuanteProps) {
  const keyboardHeight = useKeyboardHeight();
  const textoQuantidade =
    quantidade === 1 ? "rifa selecionada" : "rifas selecionadas";
  const resumoNumeros = formatarResumoNumeros(numerosSelecionados);

  return (
    <AnimatePresence>
      {quantidade > 0 && (
        <Box
          component={motion.div}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          sx={{
            ...painelAderidoStyles.carrinhoFixoArea,
            bottom: keyboardHeight,
          }}
          data-keyboard-height={keyboardHeight}
        >
          <Box sx={painelAderidoStyles.carrinhoAnimado}>
            <Paper elevation={0} sx={painelAderidoStyles.carrinhoFixoCard}>
              <Box sx={painelAderidoStyles.carrinhoFixoConteudo}>
                <Box sx={painelAderidoStyles.carrinhoResumoArea}>
                  <Box
                    component={motion.div}
                    key={quantidade} // Aciona a animação quando a quantidade muda
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    sx={painelAderidoStyles.carrinhoQuantidadeChip}
                  >
                    {quantidade}
                  </Box>

                  <Box sx={painelAderidoStyles.carrinhoTextoArea}>
                    <Typography sx={painelAderidoStyles.carrinhoFixoTitulo}>
                      {textoQuantidade}
                    </Typography>

                    <Typography sx={painelAderidoStyles.carrinhoFixoDescricao}>
                      {formatarMoeda(valorTotal)}
                    </Typography>

                    {resumoNumeros && (
                      <Typography
                        variant="caption"
                        data-testid="carrinho-resumo-numeros"
                        sx={{
                          color: "#4B635B",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          display: "block",
                          lineHeight: 1.2,
                          mt: 0.2,
                        }}
                      >
                        {resumoNumeros}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  {onLimparClick && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteSweepOutlinedIcon fontSize="small" />}
                      data-testid="carrinho-limpar"
                      onClick={onLimparClick}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 800,
                        color: "#063D31",
                        borderColor: "rgba(6, 61, 49, 0.24)",
                        minHeight: 40,
                        px: 1.5,
                        "&:hover": {
                          borderColor: "#063D31",
                          bgcolor: "rgba(6, 61, 49, 0.06)",
                        },
                      }}
                    >
                      Limpar
                    </Button>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartCheckoutIcon />}
                    data-testid="carrinho-vender"
                    onClick={onVenderClick}
                    sx={painelAderidoStyles.carrinhoFixoBotao}
                  >
                    Vender
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
}
