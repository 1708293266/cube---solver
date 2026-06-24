import * as React from "react"

import { toAbsoluteUrl } from "@/lib/url"

export type ImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /** 图片地址。支持服务端相对路径、http(s)、协议相对地址、data/blob/file 等资源地址。 */
  src?: string | null
}

/**
 * 统一的图片展示组件。
 *
 * 业务代码展示图片时优先使用 Img；如确实使用原生 img 标签，src 必须用 resolveUrl(url, true) 或 toAbsoluteUrl(url) 包裹。
 * 组件会自动把服务端返回的相对路径转换成可预览的绝对地址，避免 BASE_URL / 部署路径变化导致 404。
 */
export const Img = React.forwardRef<HTMLImageElement, ImgProps>(
  function Img(
    { src, ...props }: ImgProps,
    ref: React.ForwardedRef<HTMLImageElement>,
  ) {
    return <img ref={ref} src={toAbsoluteUrl(src ?? undefined)} {...props} />
  },
)

Img.displayName = "Img"
