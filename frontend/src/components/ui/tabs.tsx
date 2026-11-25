import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TabsProps {
  activeValue: string
  onChange: (value: string) => void
  children?: React.ReactNode
  className?: string
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, children, activeValue, onChange, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative', className)}
      {...props}
    >
      {React.Children.map(children ?? [], (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, { activeValue, onChange } as any)
      })}
    </div>
  )
)
Tabs.displayName = 'Tabs'

interface TabsListProps {
  children?: React.ReactNode
  className?: string
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
TabsList.displayName = 'TabsList'

interface TabsTriggerProps {
  value: string
  activeValue: string
  onChange: (value: string) => void
  children?: React.ReactNode
  className?: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, activeValue, onChange, ...props }, ref) => (
    <button
      ref={ref}
      role="tab"
      aria-selected={value === activeValue}
      aria-controls={`tabs-${value}-panel`}
      id={`tabs-${value}-trigger`}
      data-state={value === activeValue ? 'active' : 'inactive'}
      data-value={value}
      onClick={() => onChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className
      )}
      {...props}
    >
      {props.children}
    </button>
  )
)
TabsTrigger.displayName = 'TabsTrigger'

interface TabsContentProps {
  value: string
  activeValue: string
  children?: React.ReactNode
  className?: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, activeValue, ...props }, ref) => (
    <div
      ref={ref}
      role="tabpanel"
      id={`tabs-${value}-panel`}
      aria-labelledby={`tabs-${value}-trigger`}
      data-state={value === activeValue ? 'active' : 'inactive'}
      data-value={value}
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
    >
      {value === activeValue && props.children}
    </div>
  )
)
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }
