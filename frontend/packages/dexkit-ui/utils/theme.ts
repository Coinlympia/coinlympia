import { ThemeSchema } from "../constants/theme";
import { ThemeType } from "../types/theme";

export function parseTheme(data: any): ThemeType {
  const parser = ThemeSchema;

  const themeData = parser.parse(data);

  return themeData;
}
