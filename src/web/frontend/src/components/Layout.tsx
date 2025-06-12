import { Outlet, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Globe, 
  Camera, 
  GitCompare, 
  Puzzle, 
  Settings,
  Moon,
  Sun
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Endpoints', href: '/endpoints', icon: Globe },
  { name: 'Snapshots', href: '/snapshots', icon: Camera },
  { name: 'Compare', href: '/compare', icon: GitCompare },
  { name: 'Plugins', href: '/plugins', icon: Puzzle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true'
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b">
              <h1 className="text-xl font-bold">API Snapshot</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Dark mode toggle */}
            <div className="border-t p-4">
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">API Snapshot Verifier</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Environment: <span className="font-medium text-foreground">Development</span>
              </span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}