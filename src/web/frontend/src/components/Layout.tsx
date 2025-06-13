import { Outlet, NavLink, Link } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Globe, 
  Camera, 
  GitCompare, 
  Puzzle, 
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import SpaceSelector from '@/components/SpaceSelector'
import { useSpace } from '@/contexts/SpaceContext'

// Import package.json for version
import packageJson from '../../package.json'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Endpoints', href: '/endpoints', icon: Globe },
  { name: 'Snapshots', href: '/snapshots', icon: Camera },
  { name: 'Compare', href: '/compare', icon: GitCompare },
  { name: 'Parameters', href: '/parameters', icon: Settings },
  { name: 'Spaces', href: '/spaces', icon: Database },
  { name: 'Plugins', href: '/plugins', icon: Puzzle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const [isDark, setIsDark] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [backendVersion, setBackendVersion] = useState<string | null>(null)
  const { currentSpace } = useSpace()

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true'
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    }

    // Load sidebar preference
    const sidebarPref = localStorage.getItem('sidebarOpen')
    if (sidebarPref !== null) {
      setIsSidebarOpen(sidebarPref === 'true')
    }

    // Check if mobile on mount
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch backend version
  useEffect(() => {
    const fetchBackendVersion = async () => {
      try {
        const response = await fetch('/api/config/version')
        const data = await response.json()
        if (data.success && data.data) {
          setBackendVersion(data.data.version)
        }
      } catch (error) {
        console.error('Failed to fetch backend version:', error)
      }
    }
    fetchBackendVersion()
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

  const toggleSidebar = () => {
    const newState = !isSidebarOpen
    setIsSidebarOpen(newState)
    localStorage.setItem('sidebarOpen', String(newState))
  }

  const isMobile = () => window.innerWidth < 768

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen relative">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-lg"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Sidebar */}
        <div
          className={cn(
            'fixed md:static inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300',
            // Desktop width
            isSidebarOpen ? 'w-64' : 'w-16',
            // Mobile visibility
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center px-4 border-b justify-between">
              <Link 
                to="/"
                className={cn(
                  "font-bold transition-all duration-300 hover:text-primary",
                  isSidebarOpen ? "text-xl" : "text-sm"
                )}
                onClick={() => {
                  if (isMobile()) setIsMobileMenuOpen(false)
                }}
              >
                {isSidebarOpen ? 'API Snapshot' : 'AS'}
              </Link>
              <button
                onClick={toggleSidebar}
                className="hidden md:block p-1 rounded hover:bg-accent"
                title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => {
                    if (isMobile()) setIsMobileMenuOpen(false)
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      !isSidebarOpen && 'justify-center'
                    )
                  }
                  title={!isSidebarOpen ? item.name : undefined}
                >
                  <item.icon className={cn("shrink-0", isSidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
                  {isSidebarOpen && <span>{item.name}</span>}
                </NavLink>
              ))}
            </nav>

            {/* Dark mode toggle */}
            <div className="border-t p-4">
              <button
                onClick={toggleDarkMode}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  !isSidebarOpen && "justify-center px-0"
                )}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className={cn("shrink-0", isSidebarOpen ? "h-4 w-4" : "h-5 w-5")} /> : <Moon className={cn("shrink-0", isSidebarOpen ? "h-4 w-4" : "h-5 w-5")} />}
                {isSidebarOpen && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Spacer for mobile menu button */}
              <div className="w-10 md:hidden" />
              <h2 className="text-lg font-semibold truncate">API Snapshot Verifier</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Frontend v{packageJson.version}
                </span>
                {backendVersion && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Backend v{backendVersion}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SpaceSelector />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container max-w-7xl mx-auto py-4 md:py-6 px-4 md:px-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}