import { z } from "zod";
import { JsonSchema } from "./mcp.types";

export function toZodObject(schema?: JsonSchema) {
  const properties = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, propertySchema] of Object.entries(properties)) {
    const property = toZodType(propertySchema);
    shape[key] = required.has(key) ? property : property.optional();
  }

  return z.object(shape);
}

function toZodType(schema?: JsonSchema): z.ZodTypeAny {
  if (!schema) return z.any();

  const type = Array.isArray(schema.type)
    ? schema.type.find((item) => item !== "null")
    : schema.type;

  let result: z.ZodTypeAny;
  if (schema.enum?.length) {
    result = z.enum(schema.enum.map(String) as [string, ...string[]]);
  } else if (type === "integer") {
    result = z.number().int();
  } else if (type === "number") {
    result = z.number();
  } else if (type === "boolean") {
    result = z.boolean();
  } else if (type === "array") {
    result = z.array(toZodType(schema.items));
  } else if (type === "object" || schema.properties) {
    result = toZodObject(schema);
  } else {
    result = z.string();
  }

  return schema.description ? result.describe(schema.description) : result;
}
