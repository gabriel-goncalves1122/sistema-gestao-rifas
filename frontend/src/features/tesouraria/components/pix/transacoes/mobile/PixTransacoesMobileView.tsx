import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

import { colors } from "@/shared/tokens/colors";
import {
  PixTransacoesFiltros as PixTransacoesFiltrosState,
  PixTransacao,
} from "../../../../types/pixTransacoes";
import {
  pixPagamentoConfirmadoBanco,
  podeValidarPixTransacao,
} from "../../../../utils/pixTransacoesUtils";
import { PixEmptyState } from "../shared/PixEmptyState";
import { PixTransacaoDetalhesDialog } from "../shared/PixTransacaoDetalhesDialog";
import { PixTransacoesFiltros } from "../shared/PixTransacoesFiltros";
import { PixTransacaoCard } from "./PixTransacaoCard";

const ITENS_POR_LOTE_MOBILE = 20;

interface PixTransacoesMobileViewProps {
  filtros: PixTransacoesFiltrosState;
  transacoes: PixTransacao[];
  todasTransacoes?: PixTransacao[];
  onChangeFiltros: (filtros: PixTransacoesFiltrosState) => void;
  onAceitar: (id: string) => Promise<void>;
  onNegar: (id: string, motivo: string) => Promise<void>;
  onAbrirConciliacao?: () => void;
}

/**
 * Visão mobile de transações Pix com renderização progressiva em lotes de 20 cartões.
 */
export function PixTransacoesMobileView({
  filtros,
  transacoes,
  todasTransacoes,
  onChangeFiltros,
  onAceitar,
  onNegar,
  onAbrirConciliacao,
}: PixTransacoesMobileViewProps) {
  const [transacaoSelecionada, setTransacaoSelecionada] =
    useState<PixTransacao | null>(null);
  const [limiteVisivel, setLimiteVisivel] = useState(ITENS_POR_LOTE_MOBILE);
  const sentinelaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLimiteVisivel(ITENS_POR_LOTE_MOBILE);
  }, [transacoes]);

  useEffect(() => {
    const elemento = sentinelaRef.current;
    if (!elemento || typeof IntersectionObserver === "undefined") return;
    if (limiteVisivel >= transacoes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLimiteVisivel((atual) =>
            Math.min(atual + ITENS_POR_LOTE_MOBILE, transacoes.length),
          );
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, [transacoes.length, limiteVisivel]);

  const fonte = todasTransacoes || transacoes;

  const contagens = useMemo(() => {
    return {
      novas: fonte.filter(podeValidarPixTransacao).length,
      aprovadas: fonte.filter((t) => t.statusValidacao === "aceita").length,
      recusadas: fonte.filter((t) => t.statusValidacao === "negada").length,
      aguardando_pagamento: fonte.filter(
        (t) => !pixPagamentoConfirmadoBanco(t),
      ).length,
      todas: fonte.length,
    };
  }, [fonte]);

  const transacoesVisiveis = transacoes.slice(0, limiteVisivel);
  const restantes = transacoes.length - transacoesVisiveis.length;

  return (
    <Stack spacing={2}>
      <PixTransacoesFiltros
        filtros={filtros}
        onChangeFiltros={onChangeFiltros}
        totalResultados={transacoes.length}
        contagens={contagens}
        onAbrirConciliacao={onAbrirConciliacao}
      />

      <Box>
        <Typography
          sx={{
            color: "#021B16",
            fontWeight: 900,
            fontSize: "1rem",
            mb: 0.25,
          }}
        >
          Histórico Pix
        </Typography>

        <Typography sx={{ color: "#526760", fontSize: "0.84rem" }}>
          {transacoes.length} transação(ões) encontradas
        </Typography>
      </Box>

      {transacoes.length === 0 ? (
        <PixEmptyState />
      ) : (
        <Stack spacing={1.5} sx={{ pl: 1, pr: 0.25 }}>
          {transacoesVisiveis.map((transacao) => (
            <Box
              key={transacao.id}
              onClick={() => setTransacaoSelecionada(transacao)}
            >
              <PixTransacaoCard
                transacao={transacao}
                onAceitar={onAceitar}
                onNegar={onNegar}
              />
            </Box>
          ))}

          {restantes > 0 && (
            <Box ref={sentinelaRef} sx={{ pt: 0.5, textAlign: "center" }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() =>
                  setLimiteVisivel((atual) =>
                    Math.min(atual + ITENS_POR_LOTE_MOBILE, transacoes.length),
                  )
                }
                sx={{
                  borderRadius: 2,
                  fontWeight: 850,
                  textTransform: "none",
                  color: colors.verdeEscuro,
                  borderColor: "rgba(6, 61, 49, 0.24)",
                  py: 1,
                }}
              >
                Mostrar mais ({restantes} restante{restantes > 1 ? "s" : ""})
              </Button>
            </Box>
          )}
        </Stack>
      )}

      <PixTransacaoDetalhesDialog
        transacao={transacaoSelecionada}
        onClose={() => setTransacaoSelecionada(null)}
        onAceitar={onAceitar}
        onNegar={onNegar}
      />
    </Stack>
  );
}
