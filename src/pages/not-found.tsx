import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-surface-50 px-6 py-10 text-ink-900">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <Card className="w-full p-8 shadow-panel">
          <div className="flex max-w-2xl flex-col gap-6">
            <div className="text-6xl font-bold text-accent-600">404</div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-ink-900 sm:text-4xl">
                页面未找到
              </h1>
              <p className="text-base leading-7 text-ink-700">
                你访问的页面不存在，请检查地址是否正确。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/')}>返回首页</Button>
            </div>
          </div>
        </Card>
      </section>
    </main>
  )
}

export default NotFoundPage
