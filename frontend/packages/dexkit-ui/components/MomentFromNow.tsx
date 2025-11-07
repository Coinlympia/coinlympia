import moment from "moment";
import { memo } from "react";
import { useLocale } from "../hooks";

interface Props {
  from: moment.Moment;
}

function MomentFromNow({ from }: Props) {
  const { locale } = useLocale();
  const datetime = moment(from);

  datetime.locale(locale);

  return <span>{datetime.fromNow()}</span>;
}

export default memo(MomentFromNow);
