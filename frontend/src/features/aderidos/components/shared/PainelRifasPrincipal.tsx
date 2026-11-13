import { useMemo, useState } from "react";
import { Box } from "@mui/material";

import { BlocoVendasHeader } from "../BlocoVendasHeader";
import { FiltrosRifas } from "../FiltrosRifas";
import { GrelhaRifas } from "../GrelhaRifas";
import { painelAderidoStyles } from "../../styles/painelAderidoStyles";
import type { FiltroRifasAderido, RifaAderido } from "../../types/painelAderido";
import type { ContadoresRifas } from "../../utils/filtrosRifas";

interface PainelRifasPrincipalProps {
  filtro: FiltroRifasAderido;
  onChangeFiltro: (filtro: FiltroRifasAderido) => void;
  rifasFiltradas: RifaAderido[];
  contadoresRifas: ContadoresRifas;
  selecionadas: string[];
  onToggleSelecao: (numero: string, status: string) => void;
  onAbrirDetalhes: (rifa: RifaAderido) => void;
}

function normalizarTexto(texto?: string | null): string {
  if (!texto) return "";
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function PainelRifasPrincipal({
  filtro,
  onChangeFiltro,
  rifasFiltradas,
  contadoresRifas,
  selecionadas,
  onToggleSelecao,
  onAbrirDetalhes,
}: PainelRifasPrincipalProps) {
  const [buscaNumero, setBuscaNumero] = useState("");

  const rifasVisiveis = useMemo(() => {
    const termo = normalizarTexto(buscaNumero);
    if (!termo) return rifasFiltradas;

    return rifasFiltradas.filter((rifa) => {
      const numeroNormalizado = normalizarTexto(rifa.numero);
      const compradorNormalizado = normalizarTexto(rifa.comprador_nome);

      return (
        numeroNormalizado.includes(termo) || compradorNormalizado.includes(termo)
      );
    });
  }, [rifasFiltradas, buscaNumero]);

  return (
    <Box sx={painelAderidoStyles.blocoVendasArea}>
      <BlocoVendasHeader totalRifasVisiveis={rifasVisiveis.length} />

      <FiltrosRifas
        filtro={filtro}
        contadores={contadoresRifas}
        onChangeFiltro={onChangeFiltro}
        buscaNumero={buscaNumero}
        onChangeBuscaNumero={setBuscaNumero}
      />

      <GrelhaRifas
        rifas={rifasVisiveis}
        selecionadas={selecionadas}
        onToggleSelecao={onToggleSelecao}
        onAbrirDetalhes={onAbrirDetalhes}
      />
    </Box>
  );
}
