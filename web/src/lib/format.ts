export const formatDate = (unixSec: number) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(unixSec * 1000),
  )
