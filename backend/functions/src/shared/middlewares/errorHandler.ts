import { Request, Response, NextFunction } from "express";

import { AppError } from "../classes/AppError";

/**
 * Middleware central de tratamento de erros do Express.
 * Intercepta instâncias de `AppError` formatando respostas com códigos padronizados,
 * lida com sintaxe JSON malformada e mascara detalhes sensíveis em ambiente de produção para erros 500.
 *
 * @param {unknown} err - Objeto de erro ou exceção disparada nas rotas/controllers.
 * @param {Request} _req - Objeto de requisição do Express.
 * @param {Response} res - Objeto de resposta do Express.
 * @param {NextFunction} _next - Callback next do Express.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      error: "Formato JSON inválido na requisição.",
      code: "INVALID_JSON",
    });
    return;
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Erro interno do servidor."
      : String(err);

  console.error("[ErrorHandler]", err);

  res.status(500).json({
    error: message,
    code: "INTERNAL_ERROR",
  });
}
