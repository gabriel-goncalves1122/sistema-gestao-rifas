// ============================================================================
// ARQUIVO: frontend/src/features/auth/components/RegisterForm.tsx
// ============================================================================
import { Link as RouterLink } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { registerSchema, RegisterFormData } from "../schemas/registerSchema";
import { authStyles } from "../styles/authStyles";
import { formatarCpf, somenteNumeros } from "@/shared/utils/formatadores";

interface RegisterFormProps {
  error?: string | null;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isUIBlocked: boolean;
  onSubmit: (data: RegisterFormData) => Promise<void>;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
}

export function RegisterForm({
  error,
  showPassword,
  showConfirmPassword,
  isUIBlocked,
  onSubmit,
  onTogglePassword,
  onToggleConfirmPassword,
}: RegisterFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      nome: "",
      email: "",
      cpf: "",
      senha: "",
      confirmarSenha: "",
    },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{ width: "100%" }}
    >
      <Stack spacing={2.1}>
        <Alert severity="info" sx={authStyles.infoAlert}>
          Use o mesmo e-mail cadastrado na Keeper para sincronizar seus dados.
        </Alert>
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          required
          fullWidth
          label="Nome completo"
          autoComplete="name"
          disabled={isUIBlocked}
          {...register("nome")}
          error={!!errors.nome}
          helperText={errors.nome?.message || " "}
        />

        <TextField
          required
          fullWidth
          label="E-mail da Keeper"
          autoComplete="email"
          disabled={isUIBlocked}
          inputProps={{ autoCapitalize: "none" }}
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message || " "}
        />

        <Controller
          name="cpf"
          control={control}
          render={({ field }) => (
            <TextField
              required
              fullWidth
              label="CPF"
              value={formatarCpf(field.value)}
              onChange={(event) => {
                // Mantém apenas números no estado e exibe formatado na tela.
                field.onChange(somenteNumeros(event.target.value).slice(0, 11));
              }}
              disabled={isUIBlocked}
              error={!!errors.cpf}
              helperText={errors.cpf?.message || " "}
              inputProps={{
                inputMode: "numeric",
                maxLength: 14,
              }}
            />
          )}
        />

        <TextField
          required
          fullWidth
          label="Criar senha"
          autoComplete="new-password"
          type={showPassword ? "text" : "password"}
          disabled={isUIBlocked}
          inputProps={{ autoCapitalize: "none" }}
          {...register("senha")}
          error={!!errors.senha}
          helperText={errors.senha?.message || " "}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? "ocultar senha" : "mostrar senha"}
                  onClick={onTogglePassword}
                  edge="end"
                  disabled={isUIBlocked}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          required
          fullWidth
          label="Confirmar senha"
          autoComplete="new-password"
          type={showConfirmPassword ? "text" : "password"}
          disabled={isUIBlocked}
          inputProps={{ autoCapitalize: "none" }}
          {...register("confirmarSenha")}
          error={!!errors.confirmarSenha}
          helperText={errors.confirmarSenha?.message || " "}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showConfirmPassword
                      ? "ocultar confirmação"
                      : "mostrar confirmação"
                  }
                  onClick={onToggleConfirmPassword}
                  edge="end"
                  disabled={isUIBlocked}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isUIBlocked}
          sx={authStyles.submitButton}
        >
          {isUIBlocked ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Cadastrar e acessar"
          )}
        </Button>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          Já tem conta?{" "}
          <Box component={RouterLink} to="/login" sx={authStyles.footerLink}>
            Voltar para o login
          </Box>
        </Typography>
      </Stack>
    </Box>
  );
}
