# Стандартизация UI компонентов

## Обзор

Мы создали единую систему компонентов для всех страниц приложения, которая обеспечивает:

- **Консистентность** - все страницы используют один стиль и структуру
- **Переиспользуемость** - общие компоненты можно использовать в разных местах
- **Поддержка тем** - все компоненты адаптируются к светлой/тёмной теме
- **Доступность** - единые стандарты accessibility
- **Легкость разработки** - простой API для создания новых страниц

## Основные компоненты

### PageLayout

Главный компонент-обёртка для всех страниц.

```tsx
import { PageLayout } from "@/components/shared";

<PageLayout
  title="Page Title"
  subtitle="Optional subtitle"
  loading={isLoading}
  showRefreshButton
  onRefresh={handleRefresh}
  isRefreshing={isRefreshing}
  actions={<CustomActions />}
>
  {/* Content */}
</PageLayout>;
```

**Свойства:**

- `title` (обязательно) - заголовок страницы
- `subtitle` - подзаголовок
- `loading` - состояние загрузки (показывает скелетон)
- `showRefreshButton` - показать кнопку обновления
- `onRefresh` - функция обновления
- `isRefreshing` - состояние обновления
- `actions` - дополнительные действия в заголовке
- `error` - ошибка для отображения
- `onRetry` - функция повтора при ошибке

### PageSection

Компонент для разделения содержимого на секции.

```tsx
import { PageSection } from "@/components/shared";

<PageSection
  title="Section Title"
  description="Optional description"
  headerActions={<Actions />}
>
  {/* Section content */}
</PageSection>;
```

### StatCard

Карточка для отображения статистики.

```tsx
import { StatCard } from "@/components/shared";

<StatCard
  title="Total Items"
  value={42}
  icon={Activity}
  color="text-blue-600 dark:text-blue-400"
  bg="bg-blue-100 dark:bg-transparent"
  borderColor="dark:border-blue-400"
/>;
```

### SharedEmptyState

Компонент для пустых состояний.

```tsx
import { SharedEmptyState } from "@/components/shared";

<SharedEmptyState
  icon={Camera}
  title="No data found"
  description="Description of what to do"
  action={{
    label: "Action Button",
    onClick: handleAction,
  }}
/>;
```

## Примеры использования

### Простая страница

```tsx
import { PageLayout, PageSection } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";

export default function MyPage() {
  return (
    <PageLayout title="My Page">
      <PageSection title="Content">
        <Card>
          <CardContent>Page content here</CardContent>
        </Card>
      </PageSection>
    </PageLayout>
  );
}
```

### Страница с загрузкой и действиями

```tsx
import { PageLayout, StatCard, PageSection } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function MyDataPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    // refresh logic
  };

  const headerActions = (
    <Button variant="outline" onClick={handleAction}>
      <Plus className="h-4 w-4 mr-2" />
      Add Item
    </Button>
  );

  return (
    <PageLayout
      title="Data Dashboard"
      subtitle="Manage your data"
      loading={isLoading}
      showRefreshButton
      onRefresh={handleRefresh}
      actions={headerActions}
    >
      <PageSection title="Statistics">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Total" value={stats.total} icon={Activity} />
          <StatCard title="Active" value={stats.active} icon={CheckCircle} />
          <StatCard title="Pending" value={stats.pending} icon={Clock} />
        </div>
      </PageSection>

      <PageSection title="Data">{/* data table or content */}</PageSection>
    </PageLayout>
  );
}
```

## Рефакторинг существующих страниц

### Что изменилось

1. **Заменили заголовки страниц** на `PageLayout` с `title`
2. **Убрали дублирующиеся кнопки обновления** - используем встроенные в `PageLayout`
3. **Стандартизировали loading states** - используем `loading` prop
4. **Сгруппировали контент в секции** с помощью `PageSection`
5. **Заменили хардкодные цвета** на theme-aware классы

### Примеры рефакторинга

**До:**

```tsx
// Старый подход
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold">Page Title</h1>
    <Button onClick={refresh}>Refresh</Button>
  </div>
  <div className="bg-white p-6 rounded-lg">Content</div>
</div>
```

**После:**

```tsx
// Новый стандартизированный подход
<PageLayout title="Page Title" showRefreshButton onRefresh={refresh}>
  <PageSection>
    <Card>
      <CardContent>Content</CardContent>
    </Card>
  </PageSection>
</PageLayout>
```

## Преимущества нового подхода

1. **Меньше кода** - не нужно повторять базовую структуру
2. **Консистентность** - все страницы выглядят одинаково
3. **Автоматическая поддержка тем** - все цвета используют CSS переменные
4. **Встроенные loading и error состояния**
5. **Responsive design из коробки**
6. **Лучшая accessibility** - стандартные ARIA атрибуты
7. **Легче поддерживать** - изменения в одном месте влияют на все страницы

## Следующие шаги

1. Рефакторить оставшиеся страницы по этому паттерну
2. Добавить больше переиспользуемых компонентов (формы, таблицы, модальные окна)
3. Создать Storybook для документирования компонентов
4. Добавить автоматические тесты для компонентов
