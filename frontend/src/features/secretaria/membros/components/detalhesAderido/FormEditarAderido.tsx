import {
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  CARGOS_COMISSAO,
  CURSOS_UNIFEI,
} from "../../../../../shared/types/constants";

import type {
  AderidoSecretaria,
  FormEditarAderido as FormEditarAderidoData,
} from "../../../../../shared/types/secretaria";

import {
  formatarCpf,
  formatarTelefone,
  sanitizarCpfColagem,
  sanitizarTelefoneColagem,
  somenteNumeros,
} from "../../utils/formatadoresSecretaria";
import { colors } from "@/shared/tokens/colors";
import { components } from "@/shared/tokens/components";

interface FormEditarAderidoProps {
  aderido: AderidoSecretaria;
  form: FormEditarAderidoData;
  onChange: (campo: keyof FormEditarAderidoData, valor: string) => void;
}

function normalizarCursoParaSelect(curso?: string) {
  const cursoNormalizado = curso || "";
  const cursosValidos = CURSOS_UNIFEI.map((item) => item.toUpperCase());

  return cursosValidos.includes(cursoNormalizado) ? cursoNormalizado : "";
}

function obterLabelModalidade(aderido: AderidoSecretaria) {
  return aderido.modalidade_adesao === "meio"
    ? "Meio-aderido"
    : "Aderido completo";
}

function obterLabelStatus(status?: string) {
  if (status === "ativo") return "Ativo";
  if (status === "inativo") return "Inativo";

  return "Pendente";
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography
      variant="subtitle2"
      color="primary.dark"
      fontWeight={900}
      sx={{ letterSpacing: "0.01em" }}
    >
      {children}
    </Typography>
  );
}

const chipSx = {
  borderRadius: 2,
  bgcolor: colors.verdeClaro,
  color: colors.verdeEscuro,
  border: `1px solid ${colors.borda}`,
  fontWeight: 800,
} as const;

export function FormEditarAderido({
  aderido,
  form,
  onChange,
}: FormEditarAderidoProps) {
  const cursoSelecionado = normalizarCursoParaSelect(form.curso);
  const cursoLegadoForaDaLista = !!form.curso && !cursoSelecionado;

  return (
    <Stack spacing={2.25}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={`Status: ${obterLabelStatus(aderido.status_cadastro)}`}
          sx={chipSx}
        />
        <Chip
          size="small"
          label={`Modalidade: ${obterLabelModalidade(aderido)}`}
          sx={chipSx}
        />
        {aderido.faixa_rifas?.inicio && aderido.faixa_rifas?.fim && (
          <Chip
            size="small"
            label={`Rifas: #${aderido.faixa_rifas.inicio} a #${aderido.faixa_rifas.fim}`}
            sx={chipSx}
          />
        )}
      </Stack>

      <Stack spacing={1.5}>
        <SectionTitle>Contato</SectionTitle>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Nome"
            value={form.nome}
            onChange={(event) => onChange("nome", event.target.value)}
            fullWidth
            size="small"
            sx={components.formField}
          />

          <TextField
            label="E-mail"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            fullWidth
            size="small"
            sx={components.formField}
          />
        </Stack>
      </Stack>

      <Divider />

      <Stack spacing={1.5}>
        <SectionTitle>Dados pessoais</SectionTitle>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="CPF"
            value={formatarCpf(form.cpf)}
            onChange={(event) => {
              // Mantém o estado limpo para persistência, mas exibe formatado na tela.
              onChange("cpf", sanitizarCpfColagem(event.target.value));
            }}
            fullWidth
            size="small"
            sx={components.formField}
            inputProps={{
              inputMode: "numeric",
            }}
          />

          <TextField
            label="Telefone"
            value={formatarTelefone(form.telefone)}
            onChange={(event) => {
              // Mantém o estado limpo para persistência, mas exibe formatado na tela.
              onChange(
                "telefone",
                sanitizarTelefoneColagem(event.target.value),
              );
            }}
            fullWidth
            size="small"
            sx={components.formField}
            inputProps={{
              inputMode: "numeric",
            }}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl fullWidth size="small" sx={components.selectField}>
            <InputLabel>Curso</InputLabel>
            <Select
              value={cursoSelecionado}
              label="Curso"
              onChange={(event) => onChange("curso", event.target.value)}
            >
              <MenuItem value="">Não informado</MenuItem>

              {CURSOS_UNIFEI.map((curso) => (
                <MenuItem key={curso} value={curso.toUpperCase()}>
                  {curso}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Data de nascimento"
            value={form.data_nascimento}
            onChange={(event) => onChange("data_nascimento", event.target.value)}
            fullWidth
            size="small"
            sx={components.formField}
          />
        </Stack>
      </Stack>

      {cursoLegadoForaDaLista && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          O curso atual está salvo como “{form.curso}”, mas não existe na lista
          padronizada. Selecione um curso da lista para normalizar o cadastro.
        </Alert>
      )}

      <Divider />

      <Stack spacing={1.5}>
        <SectionTitle>Vínculo</SectionTitle>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Gênero"
            value={form.genero}
            onChange={(event) => onChange("genero", event.target.value)}
            fullWidth
            size="small"
            sx={components.formField}
          />

          <FormControl fullWidth size="small" sx={components.selectField}>
            <InputLabel>Cargo</InputLabel>
            <Select
              value={form.cargo}
              label="Cargo"
              onChange={(event) => onChange("cargo", event.target.value)}
            >
              {CARGOS_COMISSAO.map((cargo) => (
                <MenuItem key={cargo.id} value={cargo.id}>
                  {cargo.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Stack>
  );
}
