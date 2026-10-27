import { useNavigate } from 'react-router-dom'
import { useConfirm } from '../components/ConfirmDialog.tsx'
import { logoutStudio } from './store.ts'

export function useSignOut(after: '/' | '/login' = '/') {
  const confirm = useConfirm()
  const navigate = useNavigate()

  return async () => {
    const ok = await confirm({
      title: 'Leave the desk?',
      body: 'You will need to sign in again. Couples, quotes and payments stay saved on this studio.',
      confirmLabel: 'Yes, sign out',
      cancelLabel: 'Stay here',
      danger: true,
    })
    if (!ok) return
    await logoutStudio()
    navigate(after)
  }
}
