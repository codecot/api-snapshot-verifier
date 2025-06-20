import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Endpoints from '@/pages/Endpoints'
import Snapshots from '@/pages/Snapshots'
import SnapshotDetail from '@/pages/SnapshotDetail'
import Compare from '@/pages/Compare'
import Plugins from '@/pages/Plugins'
import SettingsLocal from '@/pages/SettingsLocal'
import Parameters from '@/pages/Parameters'
import SpaceManagement from '@/pages/SpaceManagement'
import BackendSetupWizard from '@/components/BackendSetupWizard'
import { useBackendConfig } from '@/hooks/useBackendConfig'

function App() {
  const { needsSetup, saveBackendUrl, backendUrl, error } = useBackendConfig()

  if (needsSetup) {
    return (
      <BackendSetupWizard
        onComplete={saveBackendUrl}
        initialUrl={backendUrl || undefined}
        error={error || undefined}
      />
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="endpoints" element={<Endpoints />} />
        <Route path="snapshots" element={<Snapshots />} />
        <Route path="snapshots/:id" element={<SnapshotDetail />} />
        <Route path="compare" element={<Compare />} />
        <Route path="parameters" element={<Parameters />} />
        <Route path="plugins" element={<Plugins />} />
        <Route path="settings" element={<SettingsLocal />} />
        <Route path="spaces" element={<SpaceManagement />} />
      </Route>
    </Routes>
  )
}

export default App