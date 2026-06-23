import { z } from "zod";

export const createResolucionSchema = z.object({
  body: z
    .object({
      tipoDocumento: z.enum(["FACTURA_VENTA", "NOTA_DEBITO", "NOTA_CREDITO"]),
      resolucion: z.string().min(1),
      codigoAutorizacion: z.string().optional(),
      prefijo: z.string().optional(),
      numeroInicial: z.number().int().positive(),
      numeroFinal: z.number().int().positive(),
      vigenciaDesde: z.coerce.date(),
      vigenciaHasta: z.coerce.date(),
      estado: z.boolean().optional(),
    })
    .refine((data) => data.vigenciaHasta >= data.vigenciaDesde, {
      message: "vigenciaHasta debe ser mayor o igual que vigenciaDesde",
      path: ["vigenciaHasta"],
    })
    .refine((data) => data.numeroFinal >= data.numeroInicial, {
      message: "numeroFinal debe ser mayor o igual que numeroInicial",
      path: ["numeroFinal"],
    }),
});

export const updateResolucionSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z
    .object({
      tipoDocumento: z.enum(["FACTURA_VENTA", "NOTA_DEBITO", "NOTA_CREDITO"]).optional(),
      resolucion: z.string().min(1).optional(),
      codigoAutorizacion: z.string().optional(),
      prefijo: z.string().optional(),
      numeroInicial: z.number().int().positive().optional(),
      numeroFinal: z.number().int().positive().optional(),
      vigenciaDesde: z.coerce.date().optional(),
      vigenciaHasta: z.coerce.date().optional(),
      estado: z.boolean().optional(),
    })
    .refine(
      (data) =>
        data.vigenciaDesde === undefined ||
        data.vigenciaHasta === undefined ||
        data.vigenciaHasta >= data.vigenciaDesde,
      {
        message: "vigenciaHasta debe ser mayor o igual que vigenciaDesde",
        path: ["vigenciaHasta"],
      }
    )
    .refine(
      (data) =>
        data.numeroInicial === undefined ||
        data.numeroFinal === undefined ||
        data.numeroFinal >= data.numeroInicial,
      {
        message: "numeroFinal debe ser mayor o igual que numeroInicial",
        path: ["numeroFinal"],
      }
    ),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
