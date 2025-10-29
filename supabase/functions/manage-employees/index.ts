// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

type Action = 'list_employees' | 'create_employee' | 'delete_employee'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ success: false, error: 'Unauthorized' }, 401)
    }

    // Клиент для проверки пользователя (с контекстом токена)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Админ-клиент (service role) — для admin.createUser и операций вне RLS
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, data } = await req.json() as { action: Action; data?: any }

    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser()
    if (userErr || !userRes?.user) return json({ success: false, error: 'Unauthorized' }, 401)
    const requester = userRes.user
    const ownerId = (requester.app_metadata as any)?.owner_id || requester.id

    switch (action) {
      case 'list_employees':
        return await listEmployees(admin, ownerId)
      case 'create_employee':
        return await createEmployee(admin, ownerId, data)
      case 'delete_employee':
        return await deleteEmployee(admin, ownerId, data)
      default:
        return json({ success: false, error: 'Unknown action' }, 400)
    }
  } catch (e: any) {
    console.error('manage-employees error', e)
    return json({ success: false, error: e?.message || 'Internal error' }, 500)
  }
})

async function listEmployees(supabase: any, ownerId: string) {
  const { data: rows, error } = await supabase
    .from('employees')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) return json({ success: false, error: error.message }, 500)
  return json({ success: true, employees: rows })
}

async function createEmployee(supabase: any, ownerId: string, data: any) {
  const { name, email, phone, role, department, salary, permissions, password } = data || {}
  if (!email || !password || !name) return json({ success: false, error: 'Missing required fields' }, 400)

  // 1) Создаем auth-пользователя (сотрудника)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'employee', owner_id: ownerId }
  })
  if (createErr) return json({ success: false, error: createErr.message }, 500)
  const authUserId = created.user.id

  // 2) Записываем в таблицу employees
  const { data: row, error: insErr } = await supabase
    .from('employees')
    .insert({
      owner_id: ownerId,
      auth_user_id: authUserId,
      name,
      email,
      phone,
      role: role || 'Сотрудник',
      department: department || 'Общий',
      salary: salary ? Number(salary) : 0,
      permissions: Array.isArray(permissions) ? permissions : []
    })
    .select()
    .single()
  if (insErr) return json({ success: false, error: insErr.message }, 500)
  return json({ success: true, employee: row })
}

async function deleteEmployee(supabase: any, ownerId: string, data: any) {
  const { employee_id } = data || {}
  if (!employee_id) return json({ success: false, error: 'employee_id required' }, 400)

  // Получим запись сотрудника
  const { data: emp, error: selErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employee_id)
    .eq('owner_id', ownerId)
    .single()
  if (selErr || !emp) return json({ success: false, error: 'Not found' }, 404)

  // Удалим auth-пользователя (или заблокируем)
  const { error: delAuthErr } = await supabase.auth.admin.deleteUser(emp.auth_user_id)
  if (delAuthErr) return json({ success: false, error: delAuthErr.message }, 500)

  // Удалим запись
  const { error: delErr } = await supabase.from('employees').delete().eq('id', employee_id)
  if (delErr) return json({ success: false, error: delErr.message }, 500)
  return json({ success: true })
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}


