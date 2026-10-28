import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";

import {
  PixTransacoesFiltros as PixTransacoesFiltrosState,
  PixTransacao,
} from "../../../../types/pixTransacoes";
import {
  pixPagamentoConfirmadoBanco,
  podeValidarPixTransacao,
} from "../../../../utils/pixTransacoesUtils";
import { PixEmptyState } from "../shared/PixEmptyState";
import { PixTransacaoAcoes } from "../shared/PixTransacaoAcoes";
import { PixTransacaoDetalhesDialog } from "../shared/PixTransacaoDetalhesDialog";
import { PixTransacoesFiltros } from "../shared/PixTransacoesFiltros";
import { PixTransacaoCard } from "./PixTransacaoCard";

interface PixTransacoesMobileViewProps {
  filtros: PixTransacoesFiltrosState;
  transacoes: PixTransacao[];
  todasTransacoes?: PixTransacao[];
  onChangeFiltros: (filtros: PixTransacoesFiltrosState) => void;
  onAceitar: (id: string) => Promise<void>;
  onNegar: (id: string, motivo: string) => Promise<void>;
}

export function PixTransacoesMobileView({
  filtros,
  transacoes,
  todasTransacoes,
  onChangeFiltros,
  onAceitar,
  onNegar,
}: PixTransacoesMobileViewProps) {
  const [transacaoSelecionada, setTransacaoSelecionada] =
    useState<PixTransacao | null>(null);

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

  return (
    <Stack spacing={2}>
      <PixTransacoesFiltros
        filtros={filtros}
        onChangeFiltros={onChangeFiltros}
        totalResultados={transacoes.length}
        contagens={contagens}
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
          {transacoes.map((transacao) => (
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
