import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  AtualizarManutencaoPayload,
  ManutencaoStatusDto,
} from "../types/sistema";

export interface ModalManutencaoAdminProps {
  open: boolean;
  onClose: () => void;
  statusAtual: ManutencaoStatusDto | null;
  onSalvar: (payload: AtualizarManutencaoPayload) => Promise<void>;
  salvando: boolean;
}

/**
 * Modal administrativo para alternar e personalizar o Modo de Manutenção do sistema.
 * Restrito para visualização e uso por Administradores e Presidência.
 */
export function ModalManutencaoAdmin({
  open,
  onClose,
  statusAtual,
  onSalvar,
  salvando,
}: ModalManutencaoAdminProps) {
  const [emManutencao, setEmManutencao] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [previsaoRetorno, setPrevisaoRetorno] = useState("");

  useEffect(() => {
    if (open && statusAtual) {
      setEmManutencao(statusAtual.emManutencao);
      setMensagem(statusAtual.mensagem || "");
      setPrevisaoRetorno(statusAtual.previsaoRetorno || "");
    }
  }, [open, statusAtual]);

  const handleConfirmar = async () => {
    await onSalvar({
      emManutencao,
      mensagem: mensagem.trim() || undefined,
      previsaoRetorno: previsaoRetorno.trim() || null,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={salvando ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <BuildCircleIcon sx={{ color: emManutencao ? "warning.main" : "#0B2F24" }} />
        <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
          Controle do Modo de Manutenção
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            backgroundColor: emManutencao ? "rgba(237, 108, 2, 0.08)" : "#F6F8F7",
            borderRadius: 2,
            border: emManutencao ? "1px solid rgba(237, 108, 2, 0.3)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0B2F24" }}>
              Status da Manutenção
            </Typography>
            <Typography variant="body2" sx={{ color: "#526760" }}>
              {emManutencao
                ? "O sistema está bloqueado para aderidos e visitantes."
                : "O sistema está operando normalmente para todos."}
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={emManutencao}
                onChange={(e) => setEmManutencao(e.target.checked)}
                color="warning"
                disabled={salvando}
              />
            }
            label={emManutencao ? "ATIVO" : "DESATIVADO"}
            labelPlacement="start"
            sx={{ m: 0, fontWeight: 700 }}
          />
        </Box>

        {emManutencao && (
          <Alert severity="warning" icon={<WarningAmberIcon />}>
            Atenção: Ao salvar com a manutenção ativa, todos os aderidos e visitantes verão
            a tela de manutenção. Somente administradores logados conseguirão acessar o sistema.
            Webhooks Pix continuarão confirmando pagamentos normalmente.
          </Alert>
        )}

        <TextField
          label="Mensagem exibida aos usuários"
          multiline
          rows={3}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Ex: Estamos realizando melhorias programadas em nosso banco de dados. Voltaremos em breve!"
          helperText="Deixe em branco para usar a mensagem padrão do sistema."
          disabled={salvando}
          fullWidth
        />

        <TextField
          label="Previsão estimada de retorno (opcional)"
          value={previsaoRetorno}
          onChange={(e) => setPrevisaoRetorno(e.target.value)}
          placeholder="Ex: Hoje às 22h00 ou Em aproximadamente 30 minutos"
          helperText="Exibida como um destaque na tela de manutenção."
          disabled={salvando}
          fullWidth
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={salvando} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmar}
          disabled={salvando}
          variant="contained"
          sx={{
            backgroundColor: emManutencao ? "warning.main" : "#0B2F24",
            "&:hover": {
              backgroundColor: emManutencao ? "warning.dark" : "#063D31",
            },
            fontWeight: 700,
            px: 3,
          }}
          startIcon={salvando ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
