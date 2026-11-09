import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

export interface InfoRow {
  label: string
  value: string
}

interface InfoTipProps {
  label: string
  content: string | readonly InfoRow[]
}

export function InfoTip({ label, content }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number }>()
  const trigger = useRef<HTMLButtonElement>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const isTouch = useRef(false)
  const wasOpenAtTouch = useRef(false)

  useLayoutEffect(() => {
    if (!open || !trigger.current || !tooltip.current) return
    const anchor = trigger.current.getBoundingClientRect()
    const bubble = tooltip.current.getBoundingClientRect()
    const left = Math.max(
      12,
      Math.min(anchor.left, window.innerWidth - bubble.width - 12),
    )
    const below = anchor.bottom + bubble.height + 12 <= window.innerHeight
    const top = below
      ? anchor.bottom + 8
      : Math.max(12, anchor.top - bubble.height - 8)
    setPosition({ left, top })
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !tooltip.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  return (
    <span
      className="info-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={trigger}
        className="icon-button info-tip-trigger"
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onPointerDown={(event) => {
          isTouch.current = event.pointerType === 'touch'
          wasOpenAtTouch.current = open
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          if (isTouch.current) {
            setOpen(!wasOpenAtTouch.current)
            isTouch.current = false
          } else if (event.detail === 0) {
            setOpen((value) => !value)
          } else {
            setOpen(true)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            trigger.current?.blur()
          }
        }}
      >
        <Info size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={tooltip}
          id={tooltipId}
          className="info-tip-bubble"
          role="tooltip"
          style={
            position
              ? { left: `${position.left}px`, top: `${position.top}px` }
              : undefined
          }
        >
          {typeof content === 'string' ? (
            <p>{content}</p>
          ) : (
            <dl>
              {content.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </span>
  )
}
