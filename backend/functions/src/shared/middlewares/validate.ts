import { Request, Response, NextFunction } from "express";
import { Schema, ValidationError } from "yup";

/**
 * Cria um middleware Express de validação de schemas Yup para o corpo da requisição (`req.body`).
 * Remove propriedades não declaradas (`stripUnknown: true`) e compila erros detalhados.
 *
 * @param {Schema<any>} schema - Schema de validação Yup.
 * @returns {import("express").RequestHandler} Middleware de validação configurado.
 */
export function validate(schema: Schema<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.validate(req.body, {
        stripUnknown: true,
        abortEarly: false,
      });
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: "Dados inválidos.",
          code: "VALIDATION_ERROR",
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
}
