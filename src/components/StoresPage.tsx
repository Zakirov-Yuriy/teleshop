import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Store, 
  Settings, 
  ExternalLink, 
  Trash2,
  Edit,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Zap,
  Target,
  TrendingUp,
  Activity,
  Globe,
  Bot,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  X,
  Eye,
  Link,
  Copy,
  Shield
} from 'lucide-react'
import { supabase, Store as StoreType } from '@/lib/supabase'
import { syncStoreProducts as syncProducts } from '@/lib/wildberries'
import { syncOzonProducts } from '@/lib/ozon'
import { setTelegramWebhook } from '@/lib/telegram'
import { auth } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

export default function StoresPage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreType | null>(null)
  const [syncingStores, setSyncingStores] = useState<Set<string>>(new Set())
  const [settingWebhookForStore, setSettingWebhookForStore] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    telegram_bot_token: '',
    wildberries_token: '',
    ozon_client_id: '',
    ozon_api_key: ''
  })

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    setLoading(true)
    try {
      const user = await auth.getCurrentUser()
      if (!user) {
        setStores([])
        return
      }

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading stores:', error)
        setStores([])
        return
      }
      setStores(data || [])
    } catch (error) {
      console.error('Error loading stores:', error)
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const user = await auth.getCurrentUser()
      if (!user) {
        alert('Необходимо войти в систему')
        return
      }

      const { data, error } = await supabase
        .from('stores')
        .insert({
          ...formData,
          owner_id: user.id,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      setStores([data, ...stores])
      setShowCreateModal(false)
      resetForm()

      // Устанавливаем webhook для Telegram бота
      if (data.telegram_bot_token) {
        await handleSetWebhook(data.id, data.telegram_bot_token)
      }
    } catch (error) {
      console.error('Error creating store:', error)
      alert('Ошибка при создании магазина')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStore) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(formData)
        .eq('id', editingStore.id)
        .select()
        .single()

      if (error) throw error

      setStores(stores.map(s => s.id === data.id ? data : s))
      setEditingStore(null)
      resetForm()
    } catch (error) {
      console.error('Error updating store:', error)
      alert('Ошибка при обновлении магазина')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStore = async (id: string) => {
    if (!confirm('Вы уверены что хотите удалить этот магазин?')) return

    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id)

      if (error) throw error

      setStores(stores.filter(s => s.id !== id))
    } catch (error) {
      console.error('Error deleting store:', error)
      alert('Ошибка при удалении магазина')
    }
  }

  const handleSyncProducts = async (storeId: string) => {
    setSyncingStores(new Set([...syncingStores, storeId]))
    
    try {
      const store = stores.find(s => s.id === storeId)
      if (!store) return

      if (store.wildberries_token) {
        await syncProducts(storeId, store.wildberries_token)
      }
      
      if (store.ozon_client_id && store.ozon_api_key) {
        await syncOzonProducts(storeId, store.ozon_client_id, store.ozon_api_key)
      }
      
      alert('Синхронизация товаров завершена')
    } catch (error) {
      console.error('Error syncing products:', error)
      alert('Ошибка при синхронизации товаров')
    } finally {
      setSyncingStores(new Set([...syncingStores].filter(id => id !== storeId)))
    }
  }

  const handleSetWebhook = async (storeId: string, botToken: string) => {
    setSettingWebhookForStore(new Set([...settingWebhookForStore, storeId]))
    
    try {
      await setTelegramWebhook(botToken)
      alert('Webhook успешно установлен')
    } catch (error) {
      console.error('Error setting webhook:', error)
      alert('Ошибка при установке webhook')
    } finally {
      setSettingWebhookForStore(new Set([...settingWebhookForStore].filter(id => id !== storeId)))
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      telegram_bot_token: '',
      wildberries_token: '',
      ozon_client_id: '',
      ozon_api_key: ''
    })
  }

  const startEdit = (store: StoreType) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      description: store.description || '',
      telegram_bot_token: store.telegram_bot_token || '',
      wildberries_token: store.wildberries_token || '',
      ozon_client_id: store.ozon_client_id || '',
      ozon_api_key: store.ozon_api_key || ''
    })
  }

  const filteredStores = stores.filter(store => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return store.status === 'active'
    if (activeTab === 'inactive') return store.status !== 'active'
    return true
  })

  if (loading && stores.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Магазины</h1>
          <p className="text-base-content/60 mt-1">Управление вашими Telegram магазинами</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Создать магазин
        </button>
      </div>

      {/* Stats */}
      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Store className="h-8 w-8" />
          </div>
          <div className="stat-title">Всего магазинов</div>
          <div className="stat-value text-primary">{stores.length}</div>
          <div className="stat-desc">Создано в системе</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-success">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="stat-title">Активные</div>
          <div className="stat-value text-success">{stores.filter(s => s.status === 'active').length}</div>
          <div className="stat-desc">Работают сейчас</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-info">
            <Bot className="h-8 w-8" />
          </div>
          <div className="stat-title">С ботами</div>
          <div className="stat-value text-info">{stores.filter(s => s.telegram_bot_token).length}</div>
          <div className="stat-desc">Telegram интеграция</div>
        </div>
        
        <div className="stat">
          <div className="stat-figure text-warning">
            <Package className="h-8 w-8" />
          </div>
          <div className="stat-title">Маркетплейсы</div>
          <div className="stat-value text-warning">{stores.filter(s => s.wildberries_token || s.ozon_api_key).length}</div>
          <div className="stat-desc">WB + Ozon</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <a 
          className={cn("tab", activeTab === 'all' && "tab-active")}
          onClick={() => setActiveTab('all')}
        >
          Все магазины ({stores.length})
        </a>
        <a 
          className={cn("tab", activeTab === 'active' && "tab-active")}
          onClick={() => setActiveTab('active')}
        >
          Активные ({stores.filter(s => s.status === 'active').length})
        </a>
        <a 
          className={cn("tab", activeTab === 'inactive' && "tab-active")}
          onClick={() => setActiveTab('inactive')}
        >
          Неактивные ({stores.filter(s => s.status !== 'active').length})
        </a>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStores.map((store) => (
          <div key={store.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all">
            <div className="card-body">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-lg w-12">
                      <Store className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h2 className="card-title">{store.name}</h2>
                    <div className={cn(
                      "badge badge-sm mt-1",
                      store.status === 'active' ? "badge-success" : "badge-ghost"
                    )}>
                      {store.status === 'active' ? 'Активен' : 'Неактивен'}
                    </div>
                  </div>
                </div>
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost btn-sm btn-circle">
                    <Settings className="h-4 w-4" />
                  </label>
                  <ul tabIndex={0} className="dropdown-content z-10 menu menu-sm bg-base-100 rounded-box w-52 p-2 shadow-xl border border-base-300">
                    <li><a onClick={() => startEdit(store)}>
                      <Edit className="h-4 w-4" />
                      Редактировать
                    </a></li>
                    <li><a onClick={() => handleSyncProducts(store.id)} disabled={syncingStores.has(store.id)}>
                      <RefreshCw className={cn("h-4 w-4", syncingStores.has(store.id) && "animate-spin")} />
                      Синхронизировать товары
                    </a></li>
                    {store.telegram_bot_token && (
                      <li><a onClick={() => handleSetWebhook(store.id, store.telegram_bot_token!)} disabled={settingWebhookForStore.has(store.id)}>
                        <Zap className="h-4 w-4" />
                        Обновить Webhook
                      </a></li>
                    )}
                    <div className="divider my-0"></div>
                    <li><a onClick={() => handleDeleteStore(store.id)} className="text-error">
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </a></li>
                  </ul>
                </div>
              </div>

              {/* Description */}
              {store.description && (
                <p className="text-sm text-base-content/60 mt-2">{store.description}</p>
              )}

              {/* Integration Status */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className={cn(
                    "h-4 w-4",
                    store.telegram_bot_token ? "text-success" : "text-base-content/30"
                  )} />
                  <span className="text-sm">
                    Telegram Bot: {store.telegram_bot_token ? 
                      <span className="text-success font-medium">Настроен</span> : 
                      <span className="text-base-content/50">Не настроен</span>
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Package className={cn(
                    "h-4 w-4",
                    store.wildberries_token ? "text-success" : "text-base-content/30"
                  )} />
                  <span className="text-sm">
                    Wildberries: {store.wildberries_token ? 
                      <span className="text-success font-medium">Подключен</span> : 
                      <span className="text-base-content/50">Не подключен</span>
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Globe className={cn(
                    "h-4 w-4",
                    store.ozon_api_key ? "text-success" : "text-base-content/30"
                  )} />
                  <span className="text-sm">
                    Ozon: {store.ozon_api_key ? 
                      <span className="text-success font-medium">Подключен</span> : 
                      <span className="text-base-content/50">Не подключен</span>
                    }
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="card-actions justify-between mt-4">
                <div className="text-xs text-base-content/50">
                  Создан: {new Date(store.created_at).toLocaleDateString('ru-RU')}
                </div>
                <button className="btn btn-sm btn-primary">
                  <ExternalLink className="h-3 w-3" />
                  Открыть
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredStores.length === 0 && (
        <div className="card bg-base-100">
          <div className="card-body items-center text-center py-12">
            <Store className="h-16 w-16 text-base-content/20 mb-4" />
            <h3 className="text-lg font-semibold">Нет магазинов</h3>
            <p className="text-base-content/60 max-w-sm">
              {activeTab === 'all' 
                ? 'Создайте свой первый магазин чтобы начать продажи в Telegram'
                : `Нет ${activeTab === 'active' ? 'активных' : 'неактивных'} магазинов`
              }
            </p>
            {activeTab === 'all' && (
              <button 
                className="btn btn-primary mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                Создать первый магазин
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingStore) && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => {
                setShowCreateModal(false)
                setEditingStore(null)
                resetForm()
              }}
            >
              <X className="h-4 w-4" />
            </button>
            
            <h3 className="font-bold text-lg mb-4">
              {editingStore ? 'Редактировать магазин' : 'Создать новый магазин'}
            </h3>
            
            <form onSubmit={editingStore ? handleUpdateStore : handleCreateStore} className="space-y-4">
              {/* Basic Info */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Название магазина</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Мой магазин"
                  className="input input-bordered" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Описание</span>
                </label>
                <textarea 
                  className="textarea textarea-bordered h-24" 
                  placeholder="Описание вашего магазина"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="divider">Интеграции</div>

              {/* Telegram */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    <Bot className="h-4 w-4 inline mr-2" />
                    Telegram Bot Token
                  </span>
                  <span className="label-text-alt">
                    <a href="https://t.me/BotFather" target="_blank" className="link link-primary text-xs">
                      Получить у @BotFather
                    </a>
                  </span>
                </label>
                <input 
                  type="text" 
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  className="input input-bordered font-mono text-sm" 
                  value={formData.telegram_bot_token}
                  onChange={(e) => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                />
              </div>

              {/* Wildberries */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    <Package className="h-4 w-4 inline mr-2" />
                    Wildberries API Token
                  </span>
                </label>
                <input 
                  type="text" 
                  placeholder="Ваш API токен Wildberries"
                  className="input input-bordered font-mono text-sm" 
                  value={formData.wildberries_token}
                  onChange={(e) => setFormData({ ...formData, wildberries_token: e.target.value })}
                />
              </div>

              {/* Ozon */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      <Globe className="h-4 w-4 inline mr-2" />
                      Ozon Client ID
                    </span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Client ID"
                    className="input input-bordered font-mono text-sm" 
                    value={formData.ozon_client_id}
                    onChange={(e) => setFormData({ ...formData, ozon_client_id: e.target.value })}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Ozon API Key</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="API Key"
                    className="input input-bordered font-mono text-sm" 
                    value={formData.ozon_api_key}
                    onChange={(e) => setFormData({ ...formData, ozon_api_key: e.target.value })}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="modal-action">
                <button 
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingStore(null)
                    resetForm()
                  }}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading && <span className="loading loading-spinner loading-sm"></span>}
                  {editingStore ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => {
            setShowCreateModal(false)
            setEditingStore(null)
            resetForm()
          }}></div>
        </div>
      )}
    </div>
  )
}