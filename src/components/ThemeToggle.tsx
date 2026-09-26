import { useEffect, useState } from "react"
import { Button } from "./ui/button"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Verifica a preferência anterior no localStorage ou a preferência do sistema
    const themeGuardado = localStorage.getItem("theme")
    if (themeGuardado) {
      return themeGuardado === "dark"
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  return (
    <> {isDark ? "Modo Claro" : "Modo Escuro"}
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsDark(!isDark)}
      className="text-muted-foreground hover:text-primary transition-colors"
      title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 transition-all" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 dark:text-slate-200 transition-all" />
      )}
    </Button>
    </>
  )
}