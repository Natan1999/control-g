import { Navigate } from 'react-router-dom'

// Evidence belongs to a real assigned instrument, never a fictitious form.
// Existing pending records are not deleted or modified by this redirect.
export default function FreePhotoPage() {
  return <Navigate to="/field/capture" replace />
}
