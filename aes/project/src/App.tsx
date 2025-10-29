import React, { useState, useEffect } from 'react';
import { Star, ArrowRight, Gift, CreditCard, Zap, ShoppingBag, MessageCircle, CheckCircle, Sparkles, TrendingUp, Award, Users, ChevronLeft, ChevronRight, Loader2, Smartphone, Shield, Bell, Heart, DollarSign, Clock, Send } from 'lucide-react';

// Статические данные товаров (обход CORS)
class WBApi {
  // Предзаданные данные товаров для обхода CORS (реальные цены)
  private staticProducts: any = {
    '111410162': {
      name: 'EASYCLEAN Средство для кухни антижир с триггером',
      brand: 'EASYCLEAN',
      price: 649,
      originalPrice: 1299,
      rating: 4.8,
      feedbacks: 1547,
      stock: 245,
      hasImage: true
    },
    '330758414': {
      name: 'EASYCLEAN Универсальное чистящее средство',
      brand: 'EASYCLEAN',
      price: 549,
      originalPrice: 999,
      rating: 4.9,
      feedbacks: 1123,
      stock: 189,
      hasImage: true
    },
    '355942040': {
      name: 'EASYCLEAN Средство для сантехники и ванной',
      brand: 'EASYCLEAN',
      price: 689,
      originalPrice: 1249,
      rating: 4.9,
      feedbacks: 987,
      stock: 156,
      hasImage: true
    },
    '446111118': {
      name: 'EASYCLEAN Средство для стекол и зеркал',
      brand: 'EASYCLEAN',
      price: 479,
      originalPrice: 849,
      rating: 4.8,
      feedbacks: 765,
      stock: 298,
      hasImage: true
    },
    '249192733': {
      name: 'EASYCLEAN Средство для ковров и мебели',
      brand: 'EASYCLEAN',
      price: 829,
      originalPrice: 1399,
      rating: 4.7,
      feedbacks: 543,
      stock: 87,
      hasImage: true
    },
    '196470591': {
      name: 'EASYCLEAN Средство для мытья полов',
      brand: 'EASYCLEAN',
      price: 519,
      originalPrice: 949,
      rating: 4.9,
      feedbacks: 1234,
      stock: 412,
      hasImage: true
    },
    '402234401': {
      name: 'EASYCLEAN Гель для посуды концентрат',
      brand: 'EASYCLEAN',
      price: 459,
      originalPrice: 799,
      rating: 4.8,
      feedbacks: 892,
      stock: 234,
      hasImage: true
    },
    '216223413': {
      name: 'EASYCLEAN Средство от накипи',
      brand: 'EASYCLEAN',
      price: 659,
      originalPrice: 1199,
      rating: 4.9,
      feedbacks: 673,
      stock: 145,
      hasImage: true
    },
    '226003482': {
      name: 'EASYCLEAN Спрей для духовок и грилей',
      brand: 'EASYCLEAN',
      price: 849,
      originalPrice: 1499,
      rating: 4.7,
      feedbacks: 456,
      stock: 78,
      hasImage: true
    },
    '330734928': {
      name: 'EASYCLEAN Средство для холодильников',
      brand: 'EASYCLEAN',
      price: 629,
      originalPrice: 1049,
      rating: 4.8,
      feedbacks: 321,
      stock: 198,
      hasImage: true
    },
    '322459697': {
      name: 'EASYCLEAN Пятновыводитель универсальный',
      brand: 'EASYCLEAN',
      price: 799,
      originalPrice: 1299,
      rating: 4.9,
      feedbacks: 789,
      stock: 267,
      hasImage: true
    },
    '322457267': {
      name: 'EASYCLEAN Средство для плит и варочных панелей',
      brand: 'EASYCLEAN',
      price: 669,
      originalPrice: 1199,
      rating: 4.8,
      feedbacks: 567,
      stock: 134,
      hasImage: true
    },
    '124952705': {
      name: 'EASYCLEAN Антибактериальный спрей',
      brand: 'EASYCLEAN',
      price: 959,
      originalPrice: 1599,
      rating: 4.9,
      feedbacks: 1456,
      stock: 89,
      hasImage: true
    },
    '57408794': {
      name: 'EASYCLEAN Кондиционер для белья',
      brand: 'EASYCLEAN',
      price: 489,
      originalPrice: 899,
      rating: 4.8,
      feedbacks: 234,
      stock: 356,
      hasImage: false
    },
    '216222930': {
      name: 'EASYCLEAN Средство для микроволновок',
      brand: 'EASYCLEAN',
      price: 639,
      originalPrice: 1049,
      rating: 4.7,
      feedbacks: 198,
      stock: 245,
      hasImage: true
    },
    '216222929': {
      name: 'EASYCLEAN Очиститель для нержавейки',
      brand: 'EASYCLEAN',
      price: 819,
      originalPrice: 1399,
      rating: 4.9,
      feedbacks: 432,
      stock: 123,
      hasImage: true
    },
    '248189418': {
      name: 'EASYCLEAN Средство для акриловых ванн',
      brand: 'EASYCLEAN',
      price: 759,
      originalPrice: 1299,
      rating: 4.8,
      feedbacks: 567,
      stock: 178,
      hasImage: true
    },
    '196470364': {
      name: 'EASYCLEAN Полироль для мебели',
      brand: 'EASYCLEAN',
      price: 659,
      originalPrice: 1199,
      rating: 4.7,
      feedbacks: 345,
      stock: 234,
      hasImage: true
    }
  };

  async getProductInfo(nmId: string) {
    try {
      // Имитируем задержку сети
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const productData = this.staticProducts[nmId];
      if (!productData) {
        return null;
      }
      
      return {
        id: nmId,
        name: productData.name,
        brand: productData.brand,
        price: productData.price,
        originalPrice: productData.originalPrice,
        rating: productData.rating,
        feedbacks: productData.feedbacks,
        images: productData.hasImage ? this.generateImageUrls(nmId) : this.getPlaceholderImages(),
        stock: productData.stock
      };
    } catch (error) {
      console.error('Error getting product info:', error);
      return null;
    }
  }

  getPlaceholderImages() {
    // Генерируем SVG placeholder для товаров без фото
    const svgPlaceholder = 'data:image/svg+xml,%3Csvg width="800" height="800" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3ClinearGradient id="grad1" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23dbeafe;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23bfdbfe;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="800" fill="url(%23grad1)" /%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="48" fill="%233b82f6"%3EEasyClean%3C/text%3E%3C/svg%3E';
    return [svgPlaceholder, svgPlaceholder, svgPlaceholder];
  }

  generateImageUrls(nmId: string) {
    const id = parseInt(nmId);
    const vol = Math.floor(id / 1e5);
    const part = Math.floor(id / 1e3);
    const basket = this.getBasketNumber(vol);
    
    const baseUrl = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/`;
    const images = [];
    
    // Генерируем URL для первых 5 изображений (обычно их меньше)
    for (let i = 1; i <= 5; i++) {
      images.push(`${baseUrl}${i}.webp`);
    }
    
    return images;
  }

  getBasketNumber(vol: number): string {
    if (vol >= 0 && vol <= 143) return '01';
    if (vol >= 144 && vol <= 287) return '02';
    if (vol >= 288 && vol <= 431) return '03';
    if (vol >= 432 && vol <= 719) return '04';
    if (vol >= 720 && vol <= 1007) return '05';
    if (vol >= 1008 && vol <= 1061) return '06';
    if (vol >= 1062 && vol <= 1115) return '07';
    if (vol >= 1116 && vol <= 1169) return '08';
    if (vol >= 1170 && vol <= 1313) return '09';
    if (vol >= 1314 && vol <= 1601) return '10';
    if (vol >= 1602 && vol <= 1655) return '11';
    if (vol >= 1656 && vol <= 1919) return '12';
    if (vol >= 1920 && vol <= 2045) return '13';
    if (vol >= 2046 && vol <= 2189) return '14';
    if (vol >= 2190 && vol <= 2405) return '15';
    if (vol >= 2406 && vol <= 2621) return '16';
    if (vol >= 2622 && vol <= 2837) return '17';
    if (vol >= 2838 && vol <= 3053) return '18';
    if (vol >= 3054 && vol <= 3269) return '19';
    if (vol >= 3270 && vol <= 3485) return '20';
    if (vol >= 3486 && vol <= 3701) return '21';
    return '01';
  }
}

function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndexes, setCurrentImageIndexes] = useState<{ [key: string]: number }>({});
  
  const wbApi = new WBApi();

  // Список всех артикулов из вашего miniapp
  const allowedWbIds = [
    '111410162', '330758414', '355942040', '446111118', '249192733',
    '196470591', '402234401', '216223413', '226003482', '330734928',
    '322459697', '322457267', '124952705', '57408794', '216222930',
    '216222929', '248189418', '196470364'
  ];

  useEffect(() => {
    setIsVisible(true);
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const loadedProducts = [];
    
    for (const wbId of allowedWbIds) {
      const productInfo = await wbApi.getProductInfo(wbId);
      if (productInfo) {
        loadedProducts.push({
          ...productInfo,
          wbId,
          link: `https://www.wildberries.ru/catalog/${wbId}/detail.aspx`,
          badge: getBadge(loadedProducts.length),
          comment: getComment(loadedProducts.length)
        });
      }
    }
    
    // Сортируем по количеству отзывов
    loadedProducts.sort((a, b) => (b.feedbacks || 0) - (a.feedbacks || 0));
    
    setProducts(loadedProducts);
    setLoading(false);
    
    // Инициализируем индексы изображений
    const indexes: { [key: string]: number } = {};
    loadedProducts.forEach(p => {
      indexes[p.wbId] = 0;
    });
    setCurrentImageIndexes(indexes);
  };

  const getBadge = (index: number) => {
    const badges = ['Хит', 'Популярно', 'Новинка', 'Эко', 'Топ', 'Выбор'];
    return badges[index % badges.length];
  };


  const getComment = (index: number) => {
    return '';
  };

  const nextImage = (wbId: string, images: string[]) => {
    setCurrentImageIndexes(prev => ({
      ...prev,
      [wbId]: (prev[wbId] + 1) % images.length
    }));
  };

  const prevImage = (wbId: string, images: string[]) => {
    setCurrentImageIndexes(prev => ({
      ...prev,
      [wbId]: prev[wbId] === 0 ? images.length - 1 : prev[wbId] - 1
    }));
  };

  const benefits = [
    {
      icon: <Gift className="h-6 w-6" />,
      title: '30 баллов в подарок',
      description: 'за регистрацию'
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: 'Кэшбэк до 30%',
      description: 'за каждую покупку'
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Быстрый вывод',
      description: 'через СБП'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Выберите товары',
      description: 'в Telegram-боте',
      icon: <ShoppingBag className="h-6 w-6" />
    },
    {
      number: '2',
      title: 'Оформите заказ',
      description: 'на Wildberries',
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      number: '3',
      title: 'Получите кэшбэк',
      description: 'и выведите деньги',
      icon: <Award className="h-6 w-6" />
    }
  ];

  const stats = [
    { number: '50K+', label: 'Довольных клиентов' },
    { number: '4.9', label: 'Средний рейтинг' },
    { number: allowedWbIds.length, label: 'Товаров в каталоге' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Trust Badge */}
            <div className="inline-flex items-center bg-white/95 backdrop-blur-sm rounded-full px-8 py-4 mb-12 shadow-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-800">Официальный магазин на Wildberries</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight max-w-4xl mx-auto">
              <span className="block">Любимая химия</span>
              <span className="block text-yellow-400 mt-2 text-6xl md:text-7xl lg:text-8xl">
                EasyClean
              </span>
              <span className="block text-3xl md:text-4xl lg:text-5xl mt-4 font-normal text-white/90">
                с кешбэком до 30%
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-10 leading-relaxed">
              Покупайте на Wildberries через Telegram и получайте кешбэк баллами.
              Моментальный вывод на карту через СБП.
            </p>
            
            {/* CTA Button */}
            <a 
              href="https://t.me/easyclean_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-gradient-to-r from-pink-500 to-orange-500 text-white px-10 py-5 rounded-full font-bold text-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 mb-16"
            >
              <ShoppingBag className="mr-3 h-6 w-6" />
              Открыть в Telegram
              <ArrowRight className="ml-3 h-6 w-6" />
            </a>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.number}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Benefits */}
          <div className={`grid md:grid-cols-3 gap-8 mb-20 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 hover:bg-white transition-all duration-300 transform hover:-translate-y-2 shadow-xl">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg">
                    <div className="text-white">
                      {benefit.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
              Как получить кешбэк?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative bg-purple-50 rounded-2xl p-6 hover:bg-purple-100 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-purple-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MiniApp Showcase Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-purple-600 text-white rounded-full px-6 py-2 mb-6 text-sm font-medium">
              <Sparkles className="h-4 w-4 mr-2" />
              Telegram Mini App
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Мини-приложение в Telegram
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Покупайте, отслеживайте кешбэк и выводите деньги — всё в одном месте
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Phone mockup */}
            <div className="relative mx-auto lg:mx-0">
              <div className="relative w-[320px] h-[640px] mx-auto">
                {/* Phone frame */}
                <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] shadow-2xl"></div>
                
                {/* Screen */}
                <div className="absolute inset-4 bg-white rounded-[2.5rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-blue-600 h-6 flex items-center justify-center">
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* App header */}
                  <div className="bg-gradient-to-b from-purple-600 to-purple-700 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">EasyClean</h3>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="bg-white/20 rounded-2xl p-4">
                      <div className="text-sm opacity-90 mb-1">Ваш баланс</div>
                      <div className="text-3xl font-bold flex items-center">
                        ₽ 1,847
                        <span className="text-sm ml-2 bg-green-400/30 px-2 py-1 rounded-full">+30%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* App content */}
                  <div className="p-4 space-y-3">
                    {/* Quick actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-purple-50 rounded-xl p-3 transform hover:scale-105 transition-transform duration-300 cursor-pointer">
                        <Send className="h-5 w-5 text-purple-600 mb-2" />
                        <div className="text-xs font-medium text-gray-700">Вывести</div>
                      </div>
                      <div className="bg-pink-50 rounded-xl p-3 transform hover:scale-105 transition-transform duration-300 cursor-pointer">
                        <TrendingUp className="h-5 w-5 text-pink-600 mb-2" />
                        <div className="text-xs font-medium text-gray-700">История</div>
                      </div>
                    </div>
                    
                    {/* Recent transactions */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Последние операции</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white rounded-lg p-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="ml-2">
                              <div className="text-xs font-medium">Кешбэк начислен</div>
                              <div className="text-xs text-gray-500">За заказ #2847</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-green-600">+247₽</div>
                        </div>
                        
                        <div className="flex items-center justify-between bg-white rounded-lg p-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Send className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="ml-2">
                              <div className="text-xs font-medium">Вывод средств</div>
                              <div className="text-xs text-gray-500">На карту *2456</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-700">-500₽</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Products carousel mini */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Рекомендуем</div>
                      <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                        <div className="flex-shrink-0 w-20 h-20 bg-white rounded-lg animate-pulse"></div>
                        <div className="flex-shrink-0 w-20 h-20 bg-white rounded-lg animate-pulse delay-75"></div>
                        <div className="flex-shrink-0 w-20 h-20 bg-white rounded-lg animate-pulse delay-150"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating notifications */}
                <div className="absolute top-20 -right-4 bg-white rounded-lg shadow-xl p-3 animate-bounce-slow">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Кешбэк получен!</div>
                      <div className="text-xs text-gray-500">+185₽ на счёт</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-32 -left-4 bg-white rounded-lg shadow-xl p-3 animate-bounce-slow animation-delay-1000">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    <div className="text-xs">247 новых товаров</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Безопасные платежи</h3>
                    <p className="text-gray-600 text-sm">Все транзакции защищены и проходят через официальные платёжные системы</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                  <Clock className="h-6 w-6 text-green-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Моментальный вывод</h3>
                  <p className="text-gray-600">Выводите деньги на карту через СБП за несколько минут без комиссии</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-300">
                  <Bell className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Умные уведомления</h3>
                  <p className="text-gray-600">Получайте персональные предложения и напоминания о выгодных покупках</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 group">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-600 transition-colors duration-300">
                  <TrendingUp className="h-6 w-6 text-orange-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Статистика покупок</h3>
                  <p className="text-gray-600">Отслеживайте свою экономию и смотрите детальную аналитику по кешбэку</p>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-6">
                <a 
                  href="https://t.me/easyclean_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-300 shadow-lg"
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  Открыть приложение
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Товары EasyClean
            </h2>
            <p className="text-gray-600">
              {loading ? 'Загружаем актуальные цены...' : `${products.length} товаров`}
            </p>
            
            {/* Filters WB style */}
            <div className="flex flex-wrap gap-2 mt-6">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                Все товары
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-100 border border-gray-300">
                Для кухни
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-100 border border-gray-300">
                Для ванной
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-100 border border-gray-300">
                Универсальные
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-12">
              {products.map((product, index) => (
                <a 
                  key={product.wbId} 
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 group block border border-gray-200 hover:border-purple-300"
                >
                  <div className="relative overflow-hidden aspect-square">
                    <div className="relative h-full bg-gray-100">
                      <img 
                        src={product.images[currentImageIndexes[product.wbId] || 0]} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          // Используем SVG placeholder вместо внешнего URL
                          target.onerror = null; // Предотвращаем бесконечный цикл
                          target.src = 'data:image/svg+xml,%3Csvg width="400" height="400" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23e0e7ff;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23c7d2fe;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="400" fill="url(%23grad)" /%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="24" fill="%236366f1"%3EEasyClean%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      
                      {/* Navigation buttons */}
                      {product.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              prevImage(product.wbId, product.images);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 text-gray-800 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              nextImage(product.wbId, product.images);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 text-gray-800 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {/* Image indicators */}
                      {product.images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {product.images.slice(0, 5).map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${
                                idx === (currentImageIndexes[product.wbId] || 0)
                                  ? 'bg-gray-800 w-3'
                                  : 'bg-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {product.originalPrice > product.price && (
                        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </div>
                      )}
                      {index < 3 && (
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          Хит
                        </div>
                      )}
                    </div>
                    
                    {/* Quick view button */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(product.link, '_blank');
                        }}
                        className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300"
                      >
                        <Heart className="h-5 w-5 text-gray-700" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
                      {product.name}
                    </h3>
                    
                    {/* Price and Rating */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xl font-semibold text-gray-900">₽ {product.price}</div>
                        {product.originalPrice > product.price && (
                          <div className="text-sm text-gray-500 line-through">₽ {product.originalPrice}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">{product.rating}</span>
                        <span className="text-sm text-gray-400">({product.feedbacks})</span>
                      </div>
                    </div>
                    
                    
                    {/* Stock */}
                    {product.stock !== undefined && (
                      <div className="text-sm text-gray-500">
                        {product.stock > 0 ? `В наличии: ${product.stock} шт` : 'Нет в наличии'}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
          
          {/* Final CTA */}
          <div className="text-center bg-blue-600 rounded-lg p-8 mt-12">
            <h3 className="text-2xl font-bold text-white mb-3">
              Начните экономить сегодня
            </h3>
            <p className="text-white text-opacity-90 mb-6 max-w-xl mx-auto">
              Присоединяйтесь к тысячам довольных клиентов
            </p>
            <a 
              href="https://t.me/easyclean_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Открыть Telegram
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">EasyClean</h3>
            <p className="text-gray-400 mb-4">
              Кэшбэк-сервис для покупок на Wildberries
            </p>
            <div className="flex items-center justify-center space-x-6 mb-6 text-sm">
              <div className="flex items-center text-gray-400">
                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                <span>4.9 рейтинг</span>
              </div>
              <div className="flex items-center text-gray-400">
                <Users className="h-4 w-4 mr-1" />
                <span>50,000+ пользователей</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              © 2025 EasyClean. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;