import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TextField,
} from "@mui/material";
import { FormEvent, useEffect, useState } from "react";

import { ResponsiveDialogShell } from "@/shared/components/ResponsiveDialogShell";
import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import { formatarTelefone } from "@/shared/utils/formatadores";
import { components } from "@/shared/tokens/components";
import { useTesourariaLayout } from "../../../hooks/useTesourariaLayout";

interface AuditoriaCompraEdicaoDialogProps {
  compra: TransacaoTesouraria | null;
  salvando: boolean;
  erro?: string | null;
  onClose: () => void;
  onSalvar: (dados: {
    nome: string;
    email?: string | null;
    telefone?: string | null;
  }) => Promise<boolean>;
}

export function AuditoriaCompraEdicaoDialog({
  compra,
  salvando,
  erro,
  onClose,
  onSalvar,
}: AuditoriaCompraEdicaoDialogProps) {
  const { isMobile } = useTesourariaLayout();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    setNome(compra?.compradorNome || "");
    setEmail(compra?.compradorEmail || "");
    setTelefone(compra?.compradorTelefone || "");
  }, [compra]);

  const nomeValido = nome.trim().length > 0;

  const salvarCampos = async () => {
    if (!nomeValido || salvando) return;

    await onSalvar({
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
    });
  };

  const salvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await salvarCampos();
  };

  const conteudoEdicao = compra && (
    <Stack spacing={2} sx={{ pt: 1, px: isMobile ? 0.5 : 0 }}>
      {erro && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {erro}
        </Alert>
      )}

      <TextField
        label="Nome do comprador"
        value={nome}
        onChange={(event) => setNome(event.target.value)}
        size="small"
        fullWidth
        required
        error={!nomeValido}
        helperText={!nomeValido ? "Informe o nome do comprador." : " "}
        disabled={salvando}
      />
      <TextField
        label="E-mail do comprador"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        size="small"
        fullWidth
        disabled={salvando}
      />
      <TextField
        label="Telefone do comprador"
        value={telefone}
        onChange={(event) => setTelefone(formatarTelefone(event.target.value))}
        size="small"
        fullWidth
        disabled={salvando}
        slotProps={{
          htmlInput: { maxLength: 15 },
        }}
      />
    </Stack>
  );

  const botoesAcoes = (
    <>
      <Button
        onClick={onClose}
        disabled={salvando}
        sx={components.botaoSecundario}
        fullWidth={isMobile}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={salvarCampos}
        disabled={!nomeValido || salvando}
        variant="contained"
        sx={components.botaoPrimario}
        fullWidth={isMobile}
      >
        {salvando ? (
          <CircularProgress size={18} color="inherit" />
        ) : (
          "Salvar alterações"
        )}
      </Button>
    </>
  );

  return (
    <ResponsiveDialogShell
      open={Boolean(compra)}
      onClose={onClose}
      isMobile={isMobile}
      title="Editar dados do comprador"
      subtitle={
        isMobile
          ? "Preparado para alterar apenas dados de contato."
          : "Preparado para alterar apenas dados de contato, sem tocar nos vínculos."
      }
      maxWidth="sm"
      formId="auditoria-compra-edicao-form"
      onSubmit={salvar}
      contentSx={{ pt: 2.75 }}
      actions={botoesAcoes}
    >
      {compra && conteudoEdicao}
    </ResponsiveDialogShell>
  );
}
