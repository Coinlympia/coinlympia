import z from "zod";

export const ReferenceSchema = z.object({
  $ref: z.string(),
});

export const ColorSchema = z.string().or(ReferenceSchema).optional();

export const ThemeColorsSchema = z.object({
  primary: ColorSchema,
  background: ColorSchema,
  secondary: ColorSchema,
  error: ColorSchema,
  warning: ColorSchema,
  info: ColorSchema,
  success: ColorSchema,
  text: ColorSchema,
  textSecondary: ColorSchema,
  paper: ColorSchema,
});

export const PalleteType = z.enum(["simple", "withDarkTheme"]);

export const SimplePalleteSchema = z.object({
  type: z.literal(PalleteType.enum.simple),
  colors: ThemeColorsSchema,
});

export const WithDarkThemePalleteSchema = z.object({
  dark: ThemeColorsSchema,
  light: ThemeColorsSchema,
  type: z.literal(PalleteType.enum.withDarkTheme),
});

export const ThemePaletteSchema = z.discriminatedUnion("type", [
  SimplePalleteSchema,
  WithDarkThemePalleteSchema,
]);

export const ThemeSchema = z.object({
  palette: ThemePaletteSchema,
  shape: z.object({ borderRadius: z.number() }).optional(),
});
