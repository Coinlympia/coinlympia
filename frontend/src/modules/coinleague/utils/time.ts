export const GET_LABEL_FROM_DURATION = (time: Number) => {
  switch (time) {
    case 60 * 5:
      return '5min';
    case 60 * 60:
      return '1hour';
    case 4 * 60 * 60:
      return '4hours';
    case 8 * 60 * 60:
      return '8hours';
    case 24 * 60 * 60:
      return '24hours';
    case 7 * 24 * 60 * 60:
      return 'one.week';
    case 30 * 7 * 24 * 60 * 60:
      return 'one.month';
    default:
      return '1hour';
  }
};
