import moment from "moment";
import { memo } from "react";

interface Props {
  from: moment.Moment;
}

function MomentSpan({ from }: Props) {
  const datetime = moment(from);

  return <span>{datetime.fromNow()}</span>;
}

export default memo(MomentSpan);
