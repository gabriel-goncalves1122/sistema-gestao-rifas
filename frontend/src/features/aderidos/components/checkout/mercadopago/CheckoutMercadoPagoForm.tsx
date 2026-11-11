// ============================================================================
// ARQUIVO: frontend/src/features/aderidos/components/checkout/mercadopago/CheckoutMercadoPagoForm.tsx
// ============================================================================
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import {
  Box,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";

import { CheckoutMercadoPagoFormData } from "./checkoutMercadoPagoSchema";
import {
  aplicarMascaraCpfCnpj,
  aplicarMascaraTelefone,
} from "../utils/checkoutUtils";
import { colors } from "@/shared/tokens/colors";

/**
 * Propriedades para renderização do formulário de comprador do Mercado Pago.
 */
interface CheckoutMercadoPagoFormProps {
  /** Registrador do react-hook-form para captura de inputs */
  register: UseFormRegister<CheckoutMercadoPagoFormData>;
  /** Função de atualização imperativa de campos com máscara */
  setValue: UseFormSetValue<CheckoutMercadoPagoFormData>;
  /** Dicionário de erros de validação Yup */
  errors: FieldErrors<CheckoutMercadoPagoFormData>;
  /** Se `true`, desabilita os campos durante a geração do Pix ou cobrança ativa */
  isDisabled?: boolean;
}

/**
 * Formulário regulatório para o Gateway Mercado Pago.
 * Exige todos os campos cadastrais necessários para emissão de Pix dinâmico pelo gateway.
 *
 * @param {CheckoutMercadoPagoFormProps} props - Propriedades do componente.
 */
export function CheckoutMercadoPagoForm({
  register,
  setValue,
  errors,
  isDisabled,
}: CheckoutMercadoPagoFormProps) {
  return (
    <Stack spacing={2}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          color: "text.primary",
          fontSize: "0.88rem",
        }}
      >
        Dados Cadastrais do Pagador
      </Typography>

      <TextField
        label="Nome Completo"
        fullWidth
        required
        disabled={isDisabled}
        inputProps={{ "data-testid": "checkout-nome" }}
        error={Boolean(errors.nome)}
        helperText={errors.nome?.message}
        placeholder="Nome impresso no documento"
        {...register("nome")}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonOutlineIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="WhatsApp"
        fullWidth
        required
        disabled={isDisabled}
        inputProps={{ "data-testid": "checkout-telefone" }}
        error={Boolean(errors.telefone)}
        helperText={errors.telefone?.message}
        placeholder="(35) 99999-9999"
        {...register("telefone")}
        onChange={(event) => {
          const valorFormatado = aplicarMascaraTelefone(event.target.value);
          setValue("telefone", valorFormatado, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PhoneOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      <Box
        sx={{
          p: 1.25,
          borderRadius: 2,
          bgcolor: colors.fundoSuave,
          border: `1px solid ${colors.bordaDestaque}`,
          display: "flex",
          gap: 1.25,
          alignItems: "center",
        }}
      >
        <InfoOutlinedIcon fontSize="small" sx={{ color: colors.verdeEscuro }} />
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: colors.cinzaTexto,
            lineHeight: 1.35,
          }}
        >
          O Mercado Pago exige CPF e E-mail para emissão da cobrança com confirmação automática.
        </Typography>
      </Box>

      <TextField
        label="E-mail do Pagador"
        fullWidth
        required
        disabled={isDisabled}
        type="email"
        inputProps={{
          "data-testid": "checkout-email",
          autoCapitalize: "none",
        }}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        placeholder="pagador@email.com"
        {...register("email")}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="CPF / CNPJ do Pagador"
        fullWidth
        required
        disabled={isDisabled}
        inputProps={{
          "data-testid": "checkout-documento",
          inputMode: "numeric",
          maxLength: 18,
        }}
        error={Boolean(errors.documento)}
        helperText={errors.documento?.message}
        placeholder="000.000.000-00"
        {...register("documento")}
        onChange={(event) => {
          const valorFormatado = aplicarMascaraCpfCnpj(event.target.value);
          setValue("documento", valorFormatado, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <BadgeOutlinedIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />
    </Stack>
  );
}
