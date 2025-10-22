import { useTheme } from '@/components/ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="btn" title="Alternar tema">
      {theme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
    </button>
  )
}
