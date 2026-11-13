import { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { aderidosMotion } from "@/shared/tokens/motion";
import type { VisaoPainelAderido } from "../../types/painelAderido";

interface AderidosSwipeTransitionProps {
  visaoAtual: VisaoPainelAderido;
  children: ReactNode;
}

export function AderidosSwipeTransition({
  visaoAtual,
  children,
}: AderidosSwipeTransitionProps) {
  const reduzirMovimento = useReducedMotion();
  const direcao = visaoAtual === "recusadas" ? 1 : -1;
  const deslocamentoEntrada = reduzirMovimento ? 0 : direcao * 18;
  const deslocamentoSaida = reduzirMovimento ? 0 : direcao * -12;
  const duracaoSwipe =
    Number.parseInt(aderidosMotion.duration.snappy, 10) / 1000;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={visaoAtual}
        role="region"
        aria-label={
          visaoAtual === "recusadas"
            ? "Aba de correção de vendas recusadas"
            : "Aba principal de rifas do aderido"
        }
        data-testid="aderidos-swipe-transition"
        data-visao={visaoAtual}
        initial={{ opacity: reduzirMovimento ? 1 : 0, x: deslocamentoEntrada }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: reduzirMovimento ? 1 : 0, x: deslocamentoSaida }}
        transition={{
          duration: reduzirMovimento ? 0 : duracaoSwipe,
          ease: aderidosMotion.framerEasing.snap,
        }}
        style={{ width: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
