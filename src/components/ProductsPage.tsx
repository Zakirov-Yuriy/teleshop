import React, { useState, useEffect } from 'react'
import { 
  Package, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Star,
  ShoppingCart,
  RefreshCw,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Plus,
  Download,
  Upload,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react'
import { supabase, Product, auth } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStore, setSelectedStore] = useState('all')
  const [selectedMarketplace, setSelectedMarketplace] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [stores, setStores] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const user = await auth.getCurrentUser()
      if (!user) {
        setProducts([])
        setStores([])
        return
      }

      // Загружаем магазины пользователя
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('status', 'active')

      if (storesError) {
        console.error('Error loading stores:', storesError)
        setStores([])
        setProducts([])
        return
      }
      setStores(storesData || [])

      // Загружаем товары
      const storeIds = storesData?.map(s => s.id) || []
      if (storeIds.length === 0) {
        setProducts([])
        return
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('store_id', storeIds)
        .order('created_at', { ascending: false })

      if (productsError) {
        console.error('Error loading products:', productsError)
        setProducts([])
        return
      }
      setProducts(productsData || [])
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesStore = selectedStore === 'all' || product.store_id === selectedStore
    const matchesMarketplace = selectedMarketplace === 'all' || product.marketplace === selectedMarketplace
    return matchesSearch && matchesCategory && matchesStore && matchesMarketplace
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'price':
        aValue = a.price
        bValue = b.price
        break
      case 'created_at':
        aValue = new Date(a.created_at)
        bValue = new Date(b.created_at)
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]
  const marketplaces = ['all', ...new Set(products.map(p => p.marketplace).filter(Boolean))]

  const getMarketplaceBadge = (marketplace: string) => {
    return marketplace === 'wildberries' ? (
      <span className="badge badge-primary badge-sm">WB</span>
    ) : marketplace === 'ozon' ? (
      <span className="badge badge-info badge-sm">Ozon</span>
    ) : (
      <span className="badge badge-ghost badge-sm">Неизвестно</span>
    )
  }

  const getStockBadge = (inStock: boolean) => {
    return inStock ? (
      <span className="badge badge-success badge-sm">В наличии</span>
    ) : (
      <span className="badge badge-error badge-sm">Нет в наличии</span>
    )
  }

  // Удаляем неиспользуемые компоненты, так как теперь всё встроено в основной рендер

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Package className="h-8 w-8" />
          </div>
          <div className="stat-title">Всего товаров</div>
          <div className="stat-value text-primary">{products.length}</div>
          <div className="stat-desc">Активных в каталоге</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <div className="stat-title">В наличии</div>
          <div className="stat-value text-success">
            {products.filter(p => p.in_stock).length}
          </div>
          <div className="stat-desc">
            {Math.round((products.filter(p => p.in_stock).length / products.length) * 100) || 0}% от общего числа
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">
            <Star className="h-8 w-8" />
          </div>
          <div className="stat-title">Средний рейтинг</div>
          <div className="stat-value text-warning">
            {products.length > 0 
              ? (products.reduce((acc, p) => acc + (p.rating || 0), 0) / products.filter(p => p.rating).length).toFixed(1)
              : '0.0'
            }
          </div>
          <div className="stat-desc">На основе отзывов</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-info">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div className="stat-title">Категорий</div>
          <div className="stat-value text-info">
            {new Set(products.map(p => p.category).filter(Boolean)).size}
          </div>
          <div className="stat-desc">Уникальных категорий</div>
        </div>
      </div>

      {/* Заголовок с действиями */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление товарами</h2>
          <p className="text-base-content/60">Каталог товаров из маркетплейсов</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
          <button className="btn btn-primary btn-sm">
            <Upload className="h-4 w-4" />
            Импорт
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="form-control">
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Поиск товаров..." 
                  className="input input-bordered w-full" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-square">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
            <select 
              className="select select-bordered w-full"
              value={selectedStore} 
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="all">Все магазины</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <select 
              className="select select-bordered w-full"
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Все категории</option>
              {categories.slice(1).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select 
              className="select select-bordered w-full"
              value={selectedMarketplace} 
              onChange={(e) => setSelectedMarketplace(e.target.value)}
            >
              <option value="all">Все маркетплейсы</option>
              {marketplaces.slice(1).map((marketplace) => (
                <option key={marketplace} value={marketplace}>
                  {marketplace === 'wildberries' ? 'Wildberries' : marketplace === 'ozon' ? 'Ozon' : marketplace}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-60">
              Найдено: <span className="font-semibold">{sortedProducts.length}</span> товаров
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="select select-bordered select-sm"
                value={`${sortBy}-${sortOrder}`} 
                onChange={(e) => { 
                  const [field, order] = e.target.value.split('-'); 
                  setSortBy(field as any); 
                  setSortOrder(order as any) 
                }}
              >
                <option value="created_at-desc">Новые первые</option>
                <option value="created_at-asc">Старые первые</option>
                <option value="name-asc">По названию А-Я</option>
                <option value="name-desc">По названию Я-А</option>
                <option value="price-asc">Дешевые первые</option>
                <option value="price-desc">Дорогие первые</option>
              </select>
              <div className="btn-group">
                <button 
                  className={cn("btn btn-sm", viewMode === 'grid' && "btn-active")}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button 
                  className={cn("btn btn-sm", viewMode === 'list' && "btn-active")}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Список товаров */}
      {sortedProducts.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
        )}>
          {sortedProducts.map((product) => (
            viewMode === 'grid' ? (
              <div key={product.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <figure className="relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Нет+изображения' }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-base-200 flex items-center justify-center">
                      <Package className="h-12 w-12 text-base-content/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStockBadge(product.in_stock)}
                  </div>
                  <div className="absolute top-2 left-2">
                    {getMarketplaceBadge(product.marketplace)}
                  </div>
                </figure>
                <div className="card-body p-4">
                  <h3 className="card-title text-sm line-clamp-2">
                    {product.name}
                  </h3>
                  {product.brand && (
                    <p className="text-xs opacity-60">{product.brand}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {product.properties?.originalPrice && product.properties.originalPrice > product.price ? (
                        <>
                          <div className="text-xs line-through opacity-50">
                            {formatPrice(product.properties.originalPrice)}
                          </div>
                          <div className="text-lg font-bold text-error">
                            {formatPrice(product.price)}
                          </div>
                        </>
                      ) : (
                        <div className="text-lg font-bold">
                          {formatPrice(product.price)}
                        </div>
                      )}
                    </div>
                    {product.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="text-sm">{product.rating}</span>
                        <span className="text-xs opacity-60">({product.reviews_count})</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs opacity-60 mt-2">
                    {product.marketplace === 'wildberries' ? 'WB' : 'Ozon'}: {product.marketplace_id || product.wb_id}
                  </div>
                  
                  <div className="card-actions justify-end mt-4">
                    <button className="btn btn-primary btn-sm">
                      <Eye className="h-4 w-4" />
                      Просмотр
                    </button>
                    <button className="btn btn-ghost btn-sm btn-circle">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={product.id} className="card bg-base-100 shadow-xl">
                <div className="card-body p-4">
                  <div className="flex items-center gap-4">
                    <div className="avatar">
                      <div className="w-20 h-20 rounded-lg">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/80x80?text=Нет+фото' }}
                          />
                        ) : (
                          <div className="w-full h-full bg-base-200 rounded-lg flex items-center justify-center">
                            <Package className="h-8 w-8 text-base-content/30" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{product.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {product.brand && (
                          <span className="text-sm opacity-60">{product.brand}</span>
                        )}
                        <span className="text-sm opacity-60">
                          {product.marketplace === 'wildberries' ? 'WB' : 'Ozon'}: {product.marketplace_id || product.wb_id}
                        </span>
                        {getMarketplaceBadge(product.marketplace)}
                        {getStockBadge(product.in_stock)}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {formatPrice(product.price)}
                      </div>
                      {product.properties?.originalPrice && product.properties.originalPrice > product.price && (
                        <div className="text-sm line-through opacity-50">
                          {formatPrice(product.properties.originalPrice)}
                        </div>
                      )}
                      {product.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="text-sm">{product.rating}</span>
                          <span className="text-xs opacity-60">({product.reviews_count})</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-12">
            {products.length === 0 ? (
              <>
                <Package className="h-16 w-16 text-base-content/30 mb-4" />
                <h3 className="text-xl font-bold mb-2">Нет товаров</h3>
                <p className="text-base-content/60 mb-4">
                  Товары появятся после синхронизации с маркетплейсами
                </p>
                <button className="btn btn-primary">
                  <Upload className="h-4 w-4" />
                  Импортировать товары
                </button>
              </>
            ) : (
              <>
                <Search className="h-16 w-16 text-base-content/30 mb-4" />
                <h3 className="text-xl font-bold mb-2">Товары не найдены</h3>
                <p className="text-base-content/60">
                  Попробуйте изменить параметры поиска или фильтры
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}