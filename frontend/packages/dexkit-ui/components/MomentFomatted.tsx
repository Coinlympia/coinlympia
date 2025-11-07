import moment from "moment";
import { memo } from "react";
import { useLocale } from "../hooks";

export interface MomentFormattedProps {
  date: string;
  format?: string;
}

export function MomentFormatted({ date, format }: MomentFormattedProps) {
  const { locale } = useLocale();

  const datetime = moment(date);

  datetime.locale(locale);

  return <span>{datetime.format(format)}</span>;
}

export default memo(MomentFormatted);
