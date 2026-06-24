"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * 可透传给 Calendar 的公共 props（避免对 v9 联合类型做 Omit）。
 *
 * react-day-picker v9 中 DayPickerProps 是联合类型，其中 PropsSingleRequired 的
 * required 字段是字面量 `true`，直接 Omit 联合类型会导致类型不兼容。
 * 解决方案：Omit 掉 mode/selected/onSelect/required 这些由 Picker 自身管理的判别字段。
 *
 * 注意：`disabled` 也 Omit 掉。Picker 把 `disabled` 收成自己的 union prop
 * （boolean | Calendar Matcher | Matcher[]），运行时再分流给按钮或 Calendar，
 * 详见下方 `DatePickerDisabled`。
 */
type SingleModeCalendarProps = Extract<React.ComponentProps<typeof Calendar>, { mode?: "single" }>
type RangeModeCalendarProps = Extract<React.ComponentProps<typeof Calendar>, { mode?: "range" }>
type CalendarPassthroughProps = Omit<SingleModeCalendarProps, "mode" | "selected" | "onSelect" | "required" | "disabled">
type CalendarRangePassthroughProps = Omit<RangeModeCalendarProps, "mode" | "selected" | "onSelect" | "required" | "disabled">

/**
 * Picker 的 disabled prop。union 设计目的是：模型/写代码的人按 react-day-picker
 * 习惯传 `disabled={(date) => date < new Date()}` 不会再撞类型；同时保留 boolean
 * 来表达"整个 picker 禁用"的常见表单语义。
 *
 * - `boolean`：禁用整个 picker（按钮不可点击；popover 不会打开）
 * - `Matcher | Matcher[]`：透传给内嵌 Calendar 的 `disabled`，
 *   用来限制内部可选日期（例：禁用过去 / 限定区间 / 排除节假日）
 */
type CalendarSingleDisabled = NonNullable<SingleModeCalendarProps["disabled"]>
type CalendarRangeDisabled = NonNullable<RangeModeCalendarProps["disabled"]>
type DatePickerDisabled = boolean | CalendarSingleDisabled
type DateRangePickerDisabled = boolean | CalendarRangeDisabled

/** 把 union prop 拆成 button 用 + Calendar 用两份。 */
function splitDisabled<TMatcher>(
  disabled: boolean | TMatcher | undefined,
): { buttonDisabled: boolean; calendarDisabled: TMatcher | undefined } {
  if (typeof disabled === "boolean") {
    return { buttonDisabled: disabled, calendarDisabled: undefined }
  }
  return { buttonDisabled: false, calendarDisabled: disabled }
}

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  formatStr = "PPP",
  ...calendarProps
}: {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: DatePickerDisabled
  formatStr?: string
} & CalendarPassthroughProps) {
  const { buttonDisabled, calendarDisabled } = splitDisabled<CalendarSingleDisabled>(disabled)
  const date = value
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={buttonDisabled}
          data-empty={!date}
          className={cn(
            "flex group w-[280px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          <span className="flex-1 truncate">
            {date ? format(date, formatStr) : placeholder}
          </span>
          {date && !buttonDisabled && (
            <span
              role="button"
              aria-label="清空"
              className="ml-auto shrink-0 rounded-sm opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(undefined)
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          {...calendarProps}
          disabled={calendarDisabled}
        />
      </PopoverContent>
    </Popover>
  )
}

function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled,
  formatStr = "LLL dd, y",
  numberOfMonths = 2,
  ...calendarProps
}: {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  disabled?: DateRangePickerDisabled
  formatStr?: string
} & CalendarRangePassthroughProps) {
  const { buttonDisabled, calendarDisabled } = splitDisabled<CalendarRangeDisabled>(disabled)
  const fromDate = value?.from
  const toDate = value?.to
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={buttonDisabled}
          data-empty={!fromDate}
          className={cn(
            "flex group w-[300px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          <span className="flex-1 truncate">
            {fromDate ? (
              toDate ? (
                <>
                  {format(fromDate, formatStr)} -{" "}
                  {format(toDate, formatStr)}
                </>
              ) : (
                format(fromDate, formatStr)
              )
            ) : (
              placeholder
            )}
          </span>
          {fromDate && !buttonDisabled && (
            <span
              role="button"
              aria-label="清空"
              className="ml-auto shrink-0 rounded-sm opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(undefined)
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={fromDate}
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          {...calendarProps}
          disabled={calendarDisabled}
        />
      </PopoverContent>
    </Popover>
  )
}

/** 生成 0-23 小时选项 */
const HOURS = Array.from({ length: 24 }, (_, i) => i)
/** 生成 0-59 分钟/秒选项 */
const SIXTY = Array.from({ length: 60 }, (_, i) => i)

function padZero(num: number): string {
  return num < 10 ? `0${num}` : String(num)
}

/**
 * 单列滚动选择器，点击选中、自动滚动到选中项。
 */
function TimeScrollColumn({
  items,
  value,
  onChange,
  disabled,
}: {
  items: number[]
  value: number | undefined
  onChange: (val: number) => void
  disabled?: boolean
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map())

  // 选中时滚动到对应项
  React.useEffect(() => {
    if (value === undefined) return
    const element = itemRefs.current.get(value)
    if (element && containerRef.current) {
      element.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className="w-16 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
    >
      <div className="flex flex-col py-1">
        {items.map((item) => (
          <button
            key={item}
            ref={(el) => {
              if (el) itemRefs.current.set(item, el)
            }}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item)}
            className={cn(
              "flex h-8 w-full items-center justify-center rounded-sm text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "disabled:pointer-events-none disabled:opacity-50",
              value === item && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {padZero(item)}
          </button>
        ))}
      </div>
    </div>
  )
}

function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
  disabled,
  formatStr = "yyyy-MM-dd HH:mm:ss",
  minuteStep = 1,
  secondStep = 1,
  showSeconds = true,
  ...calendarProps
}: {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: DatePickerDisabled
  formatStr?: string
  /** 分钟步长，默认 1 */
  minuteStep?: number
  /** 秒步长，默认 1 */
  secondStep?: number
  /** 是否显示秒列，默认 true */
  showSeconds?: boolean
} & CalendarPassthroughProps) {
  const { buttonDisabled, calendarDisabled } = splitDisabled<CalendarSingleDisabled>(disabled)
  const date = value
  const currentHour = date ? date.getHours() : undefined
  const currentMinute = date ? date.getMinutes() : undefined
  const currentSecond = date ? date.getSeconds() : undefined

  const filteredMinutes = SIXTY.filter((m) => m % minuteStep === 0)
  const filteredSeconds = SIXTY.filter((s) => s % secondStep === 0)

  const handleDateSelect = React.useCallback((selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange?.(undefined)
      return
    }
    const withTime = new Date(selectedDate)
    withTime.setHours(currentHour ?? 0, currentMinute ?? 0, currentSecond ?? 0)
    onChange?.(withTime)
  }, [currentHour, currentMinute, currentSecond, onChange])

  const handleHourChange = React.useCallback((hour: number) => {
    const base = date ? new Date(date) : new Date()
    base.setHours(hour, currentMinute ?? 0, currentSecond ?? 0)
    onChange?.(base)
  }, [date, onChange, currentMinute, currentSecond])

  const handleMinuteChange = React.useCallback((minute: number) => {
    const base = date ? new Date(date) : new Date()
    base.setHours(currentHour ?? 0, minute, currentSecond ?? 0)
    onChange?.(base)
  }, [date, onChange, currentHour, currentSecond])

  const handleSecondChange = React.useCallback((second: number) => {
    const base = date ? new Date(date) : new Date()
    base.setHours(currentHour ?? 0, currentMinute ?? 0, second)
    onChange?.(base)
  }, [date, onChange, currentHour, currentMinute])

  const timeDisplay = [
    currentHour !== undefined ? padZero(currentHour) : "00",
    currentMinute !== undefined ? padZero(currentMinute) : "00",
    ...(showSeconds ? [currentSecond !== undefined ? padZero(currentSecond) : "00"] : []),
  ].join(":")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={buttonDisabled}
          data-empty={!date}
          className={cn(
            "flex group w-[280px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          <span className="flex-1 truncate">
            {date ? format(date, formatStr) : placeholder}
          </span>
          {date && !buttonDisabled && (
            <span
              role="button"
              aria-label="清空"
              className="ml-auto shrink-0 rounded-sm opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(undefined)
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            {...calendarProps}
            disabled={calendarDisabled}
          />
          <div className="relative border-l w-32">
            {/* 时间标题 */}
            <div className="border-b px-3 py-2 text-center text-sm font-medium">
              {timeDisplay}
            </div>
            {/* 三列滚动选择，用 absolute 填充剩余高度实现等高 */}
            <div className="absolute inset-x-0 bottom-0 top-[41px] flex divide-x overflow-hidden">
              <TimeScrollColumn
                items={HOURS}
                value={currentHour}
                onChange={handleHourChange}
                disabled={buttonDisabled}
              />
              <TimeScrollColumn
                items={filteredMinutes}
                value={currentMinute}
                onChange={handleMinuteChange}
                disabled={buttonDisabled}
              />
              {showSeconds && (
                <TimeScrollColumn
                  items={filteredSeconds}
                  value={currentSecond}
                  onChange={handleSecondChange}
                  disabled={buttonDisabled}
                />
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, DateRangePicker, DateTimePicker }
