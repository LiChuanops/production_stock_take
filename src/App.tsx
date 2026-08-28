import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { syncEngine } from './lib/sync'
import { RoomPicker } from './pages/RoomPicker'
import { CountPage } from './pages/CountPage'
import { RecordsPage } from './pages/RecordsPage'
import { SyncPage } from './pages/SyncPage'

export default function App() {
  useEffect(() => {
    void syncEngine.start()
    return () => syncEngine.stop()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<RoomPicker />} />
      <Route path="/room/:roomId" element={<CountPage />} />
      <Route path="/room/:roomId/records" element={<RecordsPage />} />
      <Route path="/sync" element={<SyncPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
