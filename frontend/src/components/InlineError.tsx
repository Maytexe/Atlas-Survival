import { messages } from '@/i18n/pt-BR'

interface InlineErrorProps {
  error: unknown
}

export function InlineError({ error }: InlineErrorProps) {
  if (!error) return null
  const detail = error instanceof Error ? error.message : messages.unknownError
  return (
    <div className="notice notice-error" role="alert">
      {messages.errorPrefix} {detail}
    </div>
  )
}
