// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/CarrinhoFlutuante.tsx
// ============================================================================
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import { Box, Button, Paper, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

import { useKeyboardHeight } from "@/shared/hooks/useKeyboardHeight";
import { painelAderidoStyles } from "./styles/painelAderidoStyles";
import { formatarMoeda } from "@/shared/utils/formatadores";

/**
 * Propriedades para renderização do carrinho flutuante de checkout do aderido.
 */
export interface CarrinhoFlutuanteProps {
  /** Quantidade total de rifas selecionadas */
  quantidade: number;
  /** Valor monetário consolidado das rifas selecionadas */
  valorTotal: number;
  /** Ação principal disparada ao clicar no botão de pagamento */
  onPagarClick?: () => void;
  /**
   * Alias retrocompatível para onPagarClick.
   */
  onVenderClick?: () => void;
  /** Lista opcional de números das rifas para renderização do resumo */
  numerosSelecionados?: string[];
  /**
   * @deprecated O botão Limpar foi removido de dentro do carrinho flutuante.
   * A deseleção de rifas é realizada diretamente pelo clique na rifa na grelha.
   */
  onLimparClick?: () => void;
}

function formatarResumoNumeros(numeros?: string[]): string | null {
  if (!numeros || numeros.length === 0) return null;
  const limite = 4;
  const visiveis = numeros.slice(0, limite).map((n) => `#${n}`).join(", ");
  const restantes = numeros.length - limite;
  return restantes > 0 ? `${visiveis} +${restantes}` : visiveis;
}

/**
 * Componente de Carrinho Flutuante para checkout das rifas do aderido.
 * Exibe a quantidade e o valor total selecionados com botão único de pagamento ("Pagar").
 *
 * @param {CarrinhoFlutuanteProps} props - Propriedades do carrinho.
 * @returns {JSX.Element} Elemento animado do carrinho flutuante.
 */
export function CarrinhoFlutuante({
  quantidade,
  valorTotal,
  onPagarClick,
  onVenderClick,
  numerosSelecionados,
}: CarrinhoFlutuanteProps) {
  const keyboardHeight = useKeyboardHeight();
  const textoQuantidade =
    quantidade === 1 ? "rifa selecionada" : "rifas selecionadas";
  const resumoNumeros = formatarResumoNumeros(numerosSelecionados);
  const handleAcaoPagar = onPagarClick ?? onVenderClick;

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

                <Button
                  variant="contained"
                  startIcon={<ShoppingCartCheckoutIcon />}
                  data-testid="carrinho-pagar"
                  onClick={handleAcaoPagar}
                  sx={painelAderidoStyles.carrinhoFixoBotao}
                >
                  Pagar
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
}
