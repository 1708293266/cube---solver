import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * `Empty` 同时支持两种写法，开发者按习惯任选其一：
 *
 * 1. **Shorthand props**（icon / title / description / action）—— 跟 antd / Chakra
 *    等库的 EmptyState 习惯对齐。也兼容常见的 actionText / onAction 写法。
 *    任一 prop 给值时内部自动套上标准 compound 布局（EmptyHeader +
 *    EmptyMedia variant="icon" + EmptyTitle + EmptyDescription + EmptyContent）。
 *
 * 2. **Compound children** —— shadcn 原生写法。把 EmptyHeader / EmptyMedia /
 *    EmptyTitle / EmptyDescription / EmptyContent 作为 children 自由组合，适合
 *    更复杂的版式（多按钮、嵌入表单、自定义结构）。
 *
 * 两种写法可叠加：shorthand 渲染在前，children 渲染在后。
 */

/**
 * `icon` 接受两种值，统一在 `renderEmptyIcon` 里规整：
 *
 *   - `React.ReactElement` —— 已实例化的图标节点（`<Package className="..."/>`），
 *     原样透传，调用方可自定义 className/事件等。
 *   - `React.ComponentType<{ className?: string }>` —— 组件引用本身（`Package`），
 *     wrapper 帮忙以 `className="size-6"` 实例化，匹配 `EmptyMedia variant="icon"`
 *     的视觉规格。lucide 图标是 `forwardRef` 对象、不是普通 function，所以这里
 *     用 `React.isValidElement` 而不是 `typeof === "function"` 区分。
 */
type EmptyIconProp =
  | React.ReactElement
  | React.ComponentType<{ className?: string }>

function renderEmptyIcon(icon: EmptyIconProp | undefined): React.ReactNode {
  if (icon == null) return null
  if (React.isValidElement(icon)) return icon
  const Icon = icon as React.ComponentType<{ className?: string }>
  return <Icon className="size-6" />
}

type EmptyShorthandProps = {
  icon?: EmptyIconProp
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  actionText?: React.ReactNode
  onAction?: React.MouseEventHandler<HTMLButtonElement>
}

function Empty({
  className,
  icon,
  title,
  description,
  action,
  actionText,
  onAction,
  children,
  ...props
}: React.ComponentProps<"div"> & EmptyShorthandProps) {
  const hasHeader = icon != null || title != null || description != null
  const resolvedAction =
    action ??
    (actionText != null ? (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {actionText}
      </button>
    ) : null)
  const hasShorthand = hasHeader || resolvedAction != null
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center md:p-12",
        className
      )}
      {...props}
    >
      {hasShorthand && (
        <>
          {hasHeader && (
            <EmptyHeader>
              {icon != null && (
                <EmptyMedia variant="icon">{renderEmptyIcon(icon)}</EmptyMedia>
              )}
              {title != null && <EmptyTitle>{title}</EmptyTitle>}
              {description != null && (
                <EmptyDescription>{description}</EmptyDescription>
              )}
            </EmptyHeader>
          )}
          {resolvedAction != null && <EmptyContent>{resolvedAction}</EmptyContent>}
        </>
      )}
      {children}
    </div>
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className
      )}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
