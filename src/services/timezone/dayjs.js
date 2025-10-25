import dayjs from 'dayjs'
import dayjsUTC from 'dayjs/plugin/utc'
import dayjsTimeZone from 'dayjs/plugin/timezone'

dayjs.extend(dayjsUTC)
dayjs.extend(dayjsTimeZone)
dayjs.tz.setDefault('Asia/Ho_Chi_Minh')
export default dayjs
