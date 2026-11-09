import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeading({ title, description, action }: PageHeadingProps) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </header>
  )
}
