import type { ChangeEvent } from "react";
import {
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";

import { SectionTitle } from "@/shared/components/SectionTitle";
import { components } from "@/shared/tokens/components";
import { CURSOS_UNIFEI } from "@/shared/types/constants";
import type { FormNovoAderido } from "@/shared/types/secretaria";
import { formatarTelefone } from "../../../utils/formatadoresSecretaria";

type DadosFieldChangeEvent =
  | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  | SelectChangeEvent<string>;

/**
 * Propriedades da seção de identificação e dados opcionais do formulário de novo membro.
 */
export interface ModalAdicionarAderidoDadosFieldsProps {
  /** Estado atual dos campos do formulário. */
  form: FormNovoAderido;
  /** Indica submissão ativa para bloqueio dos inputs. */
  isSubmitting: boolean;
  /** Handler genérico de atualização de campos de texto e select. */
  onChange: (event: DadosFieldChangeEvent) => void;
  /** Handler específico para aplicar máscara numérica ao campo de telefone. */
  onTelefoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Agrupa os campos obrigatórios (e-mail, nome) e opcionais (curso, nascimento, telefone)
 * do modal de cadastro de membro na Secretaria.
 *
 * @param {ModalAdicionarAderidoDadosFieldsProps} props - Estado do formulário e callbacks de alteração.
 * @returns {JSX.Element} Seções de identificação e dados complementares do membro.
 */
export function ModalAdicionarAderidoDadosFields({
  form,
  isSubmitting,
  onChange,
  onTelefoneChange,
}: ModalAdicionarAderidoDadosFieldsProps) {
  return (
    <>
      <Stack spacing={1.5}>
        <SectionTitle>Identificação</SectionTitle>
        <TextField
          name="email"
          label="E-mail da Keeper *"
          fullWidth
          required
          value={form.email}
          onChange={onChange}
          placeholder="exemplo@unifei.br"
          disabled={isSubmitting}
          size="small"
          sx={components.formField}
        />

        <TextField
          name="nome"
          label="Nome completo"
          fullWidth
          value={form.nome}
          onChange={onChange}
          disabled={isSubmitting}
          size="small"
          sx={components.formField}
        />
      </Stack>

      <Divider />

      <Stack spacing={1.5}>
        <SectionTitle>Dados opcionais</SectionTitle>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl
            fullWidth
            disabled={isSubmitting}
            size="small"
            sx={components.selectField}
          >
            <InputLabel id="curso-label">Curso</InputLabel>
            <Select
              labelId="curso-label"
              name="curso"
              value={form.curso}
              label="Curso"
              onChange={onChange}
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
            name="dataNascimento"
            label="Data de Nascimento"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.dataNascimento}
            onChange={onChange}
            disabled={isSubmitting}
            size="small"
            sx={components.formField}
          />
        </Stack>

        <TextField
          name="telefone"
          label="Telefone"
          fullWidth
          placeholder="(35) 9..."
          value={formatarTelefone(form.telefone)}
          onChange={onTelefoneChange}
          disabled={isSubmitting}
          size="small"
          sx={components.formField}
          inputProps={{
            inputMode: "numeric",
          }}
        />
      </Stack>
    </>
  );
}
