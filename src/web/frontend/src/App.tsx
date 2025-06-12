import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Endpoints from '@/pages/Endpoints'
import Snapshots from '@/pages/Snapshots'
import Compare from '@/pages/Compare'
import Plugins from '@/pages/Plugins'
import Settings from '@/pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="endpoints" element={<Endpoints />} />
        <Route path="snapshots" element={<Snapshots />} />
        <Route path="compare" element={<Compare />} />
        <Route path="plugins" element={<Plugins />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App