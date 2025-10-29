import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { 
  UserCheck, 
  Search, 
  Filter,
  Eye,
  MessageSquare,
  Phone,
  Calendar,
  Plus,
  Edit,
  Trash2,
  MapPin,
  User,
  Mail,
  Star,
  TrendingUp,
  Shield,
  Clock,
  CreditCard,
  X,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react'
import { supabase, auth } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'

interface Employee {
  id: string
  owner_id: string
  auth_user_id: string
  name: string
  email: string
  phone: string
  role: string
  status: string
  department: string
  hire_date: string
  salary: number
  permissions: string[]
  created_at: string
  updated_at: string
}

export default function EmployeesPage() {
  // Тосты
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; title: string; description?: string }>>([])
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    setToasts(prev => [...prev, { id, type, title, description }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'department' | 'date'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Форма создания сотрудника
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Менеджер',
    department: 'Продажи',
    salary: '',
    password: '',
    confirm: '',
    permissions: ['view_orders','edit_products','manage_customers'] as string[]
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const token = (await auth.getSession())?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'list_employees' })
      })
      const data = await res.json()
      if (data.success) {
        setEmployees(data.employees || [])
      } else {
        showToast('error', 'Ошибка загрузки', data.error || 'Не удалось получить сотрудников')
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      showToast('error', 'Ошибка', 'Не удалось загрузить сотрудников')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.email || !form.password || form.password !== form.confirm || !form.name) {
      showToast('warning', 'Проверьте форму', 'Имя, email и пароль обязательны; пароли должны совпадать')
      return
    }
    try {
      setCreating(true)
      const token = (await auth.getSession())?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          action: 'create_employee',
          data: {
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            role: form.role,
            department: form.department,
            salary: form.salary ? Number(form.salary) : 0,
            permissions: form.permissions,
            password: form.password
          }
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Сотрудник добавлен')
        setShowAddModal(false)
        setForm({ name: '', email: '', phone: '', role: 'Менеджер', department: 'Продажи', salary: '', password: '', confirm: '', permissions: ['view_orders','edit_products','manage_customers'] })
        loadEmployees()
      } else {
        showToast('error', 'Ошибка', data.error || 'Не удалось создать сотрудника')
      }
    } catch (e) {
      console.error(e)
      showToast('error', 'Ошибка', 'Не удалось создать сотрудника')
    } finally {
      setCreating(false)
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const fullName = (employee.name||'').toLowerCase()
    const email = (employee.email||'').toLowerCase()
    const role = (employee.role||'').toLowerCase()
    const department = (employee.department||'').toLowerCase()
    
    return fullName.includes(searchQuery.toLowerCase()) ||
           email.includes(searchQuery.toLowerCase()) ||
           role.includes(searchQuery.toLowerCase()) ||
           department.includes(searchQuery.toLowerCase())
  })

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'role':
        aValue = a.role.toLowerCase()
        bValue = b.role.toLowerCase()
        break
      case 'department':
        aValue = a.department.toLowerCase()
        bValue = b.department.toLowerCase()
        break
      case 'date':
        aValue = new Date(a.hire_date)
        bValue = new Date(b.hire_date)
        break
      default:
        aValue = new Date(a.hire_date)
        bValue = new Date(b.hire_date)
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const getEmployeeStats = () => {
    const total = employees.length
    const active = employees.filter(e => e.status === 'active').length
    const totalSalary = employees.reduce((sum, e) => sum + e.salary, 0)
    const avgSalary = total > 0 ? totalSalary / total : 0
    
    return { total, active, totalSalary, avgSalary }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'администратор':
        return 'bg-red-100 text-red-800'
      case 'менеджер':
        return 'bg-blue-100 text-blue-800'
      case 'специалист поддержки':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const stats = getEmployeeStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
        {toasts.map(t => (
          <div key={t.id} className="w-[90vw] sm:w-80 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 flex items-start gap-3">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-indigo-600" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                {t.description && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{t.description}</div>}
              </div>
              <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="h-1 bg-gray-100"><div className="h-1 bg-indigo-500" style={{ width: '100%', animation: 'shrink 4.5s linear forwards' }} /></div>
          </div>
        ))}
      </div>

      {/* Заголовок */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Сотрудники</h1>
            <p className="text-sm text-gray-600 mt-1">Управление персоналом ({employees.length})</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Добавить сотрудника
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Всего сотрудников</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <UserCheck className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Активные</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Общий фонд зарплат</p>
                <p className="text-2xl font-semibold text-gray-900">{formatPrice(stats.totalSalary)}</p>
              </div>
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Средняя зарплата</p>
                <p className="text-2xl font-semibold text-gray-900">{formatPrice(stats.avgSalary)}</p>
              </div>
              <Star className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <Card className="border border-gray-200 bg-white">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Поиск сотрудников..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="date">По дате приема</option>
                <option value="name">По имени</option>
                <option value="role">По должности</option>
                <option value="department">По отделу</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список сотрудников */}
      <div className="space-y-3">
        {sortedEmployees.length > 0 ? (
          sortedEmployees.map((employee) => (
            <Card key={employee.id} className="border border-gray-200 bg-white hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="font-medium text-base text-gray-900">{employee.name}</h3>
                        <Badge className={getRoleColor(employee.role)}>
                          {employee.role}
                        </Badge>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {employee.email}
                        </div>
                        {employee.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {employee.phone}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          {employee.department}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Принят: {formatDate(employee.hire_date)}
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="text-sm text-gray-600">
                          Права доступа: {employee.permissions.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="space-y-1">
                      <div className="text-xl font-semibold text-gray-900">
                        {formatPrice(employee.salary)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Зарплата
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>ID: {employee.id}</span>
                    <span className="text-gray-300">•</span>
                    <span>Создан: {formatDate(employee.created_at)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8">
                      <Eye className="h-4 w-4 mr-1" />
                      Профиль
                    </Button>
                    <Button size="sm" variant="outline" className="h-8">
                      <Edit className="h-4 w-4 mr-1" />
                      Редактировать
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-red-600 hover:text-red-700" onClick={async ()=>{
                      try {
                        const token = (await auth.getSession())?.access_token
                        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-employees`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}` },
                          body: JSON.stringify({ action: 'delete_employee', data: { employee_id: employee.id } })
                        })
                        const data = await res.json()
                        if (data.success) { showToast('success', 'Удалено'); loadEmployees() } else { showToast('error', 'Ошибка удаления', data.error || '') }
                      } catch (e) { showToast('error', 'Ошибка', 'Не удалось удалить') }
                    }}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border border-gray-200 bg-white">
            <CardContent className="text-center py-12">
              {employees.length === 0 ? (
                <>
                  <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Нет сотрудников
                  </h3>
                  <p className="text-gray-600">
                    Добавьте первого сотрудника для начала работы
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Сотрудники не найдены
                  </h3>
                  <p className="text-gray-600">
                    Попробуйте изменить параметры поиска
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Модалка добавления сотрудника */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить сотрудника</DialogTitle>
            <DialogDescription>Укажите данные сотрудника и пароль для входа</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700 mb-1 block">Имя</label>
              <Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Email</label>
              <Input type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} placeholder="name@example.com" />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Телефон</label>
              <Input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} placeholder="+7 ..." />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Роль</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" value={form.role} onChange={(e)=>setForm({...form, role: e.target.value})}>
                <option>Администратор</option>
                <option>Менеджер</option>
                <option>Специалист поддержки</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Отдел</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" value={form.department} onChange={(e)=>setForm({...form, department: e.target.value})}>
                <option>Продажи</option>
                <option>Маркетинг</option>
                <option>IT</option>
                <option>Поддержка</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Зарплата (₽)</label>
              <Input type="number" value={form.salary} onChange={(e)=>setForm({...form, salary: e.target.value})} placeholder="60000" />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Пароль</label>
              <Input type="password" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Повтор пароля</label>
              <Input type="password" value={form.confirm} onChange={(e)=>setForm({...form, confirm: e.target.value})} placeholder="••••••••" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700 mb-1 block">Права доступа</label>
              <div className="flex flex-wrap gap-2 text-sm">
                {['view_orders','edit_products','manage_customers','view_analytics','manage_users'].map(p => (
                  <label key={p} className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-2 py-1">
                    <input type="checkbox" checked={form.permissions.includes(p)} onChange={(e)=>{
                      setForm(f => ({...f, permissions: e.target.checked ? [...f.permissions, p] : f.permissions.filter(x=>x!==p)}))
                    }} />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAddModal(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? 'Создание...' : 'Создать'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 