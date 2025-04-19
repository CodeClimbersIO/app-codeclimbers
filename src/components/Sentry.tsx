import * as Sentry from '@sentry/react'
import { isDev } from '@/lib/utils/environment'
export const initSentry = () => {
  if (!isDev()) {
    Sentry.init({
      dsn: 'https://7bb4de66bbe81c20f5a87cfa89104dff@o4508951187554304.ingest.us.sentry.io/4508951227334656'
    })
  }
}

