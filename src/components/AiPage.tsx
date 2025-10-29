import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, Server, CheckCircle2, Link } from 'lucide-react'

export default function AiPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">AI Агент</h1>
            <p className="text-sm text-gray-600 mt-1">Состояние и подключение интеграций</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Статус агента</CardTitle>
            <CardDescription>Операционная готовность и стабильность</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Агент работает стабильно</div>
              <Badge className="bg-emerald-100 text-emerald-800">OK</Badge>
            </div>
            <div className="text-sm text-gray-700">
              Последняя проверка: актуально. Ошибок не обнаружено.
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Подключение к серверу</CardTitle>
            <CardDescription>API интеграция</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="text-indigo-700 flex items-center gap-2"><Link className="h-4 w-4" /> Связь установлена</div>
              <Badge className="bg-indigo-100 text-indigo-800">api.teleshop.su</Badge>
            </div>
            <div className="text-sm text-gray-700">Эндпоинты доступны, авторизация проходит успешно.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


