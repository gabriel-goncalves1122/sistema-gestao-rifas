import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useState } from "react";

import { TransacaoTesouraria } from "../../../types/auditoriaCompras";
import { formatarTelefone } from "@/shared/utils/formatadores";
import { colors } from "@/shared/tokens/colors";
import { surfaces } from "@/shared/tokens/surfaces";
import { components } from "@/shared/tokens/components";
import { typographyScale as typography } from "@/shared/tokens/typography";
import { layout } from "../../../styles/layout";
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

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={Boolean(compra)}
        onClose={onClose}
        PaperProps={{
          sx: layout.drawerPaper,
        }}
      >
        {compra && (
          <Stack
            component="form"
            id="auditoria-compra-edicao-form"
            onSubmit={salvar}
            spacing={2}
            sx={{ pb: 2 }}
          >
            <Box sx={layout.drawerPullHandle} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography sx={{ ...typography.titulo, fontSize: "1.2rem" }}>
                  Editar dados do comprador
                </Typography>
                <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.85rem", mt: 0.2 }}>
                  Preparado para alterar apenas dados de contato.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", pb: 1 }}>
              {conteudoEdicao}
            </Box>
            <Box sx={{ pt: 1, borderTop: `1px solid ${colors.borda}` }}>
              <Stack direction="row" spacing={1.5}>
                {botoesAcoes}
              </Stack>
            </Box>
          </Stack>
        )}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={Boolean(compra)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: surfaces.dialog,
      }}
    >
      <DialogTitle
        sx={surfaces.dialogTitle}
      >
        Editar dados do comprador
        <Typography sx={{ color: colors.cinzaTexto, fontSize: "0.88rem", mt: 0.45 }}>
          Preparado para alterar apenas dados de contato, sem tocar nos vínculos.
        </Typography>
      </DialogTitle>
      {compra && (
        <DialogContent
          component="form"
          id="auditoria-compra-edicao-form"
          onSubmit={salvar}
          sx={{ pt: 2.75 }}
        >
          {conteudoEdicao}
        </DialogContent>
      )}
      <DialogActions sx={surfaces.dialogActions}>
        {botoesAcoes}
      </DialogActions>
    </Dialog>
  );
}
