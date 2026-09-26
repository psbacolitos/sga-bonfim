import { useState, useEffect } from "react"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { supabase } from "../lib/supabase"
import {
  Home,
  Users,
  UserCheck,
  Church,
  User,
  LogOut,
  ChevronDown,
  Bell,
  Calendar
} from "lucide-react"
import { Button } from "../components/ui/button"
import ThemeToggle from "./ThemeToggle"

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState("")
  const [eCoordenador, setECoordenador] = useState(false)

  useEffect(() => {
    fetchUsuario()
  }, [])

  const fetchUsuario = async () => {
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      const { data } = await supabase
        .from('acolitos')
        .select('nome, e_coordenador')
        .eq('user_id', authData.user.id)
        .single()

      if (data) {
        setNomeUsuario(data.nome.split(" ")[0])
        setECoordenador(data.e_coordenador ?? false)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative">

      {/* 1. CABEÇALHO SUPERIOR */}
      <header className="border-b border-border bg-card p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/painel")}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
            A
          </div>
          <span className="font-bold text-lg text-primary tracking-tight">
            Acólitos do Bonfim
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Menu de Perfil / Ações */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:bg-accent"
              onClick={() => setMenuAberto(!menuAberto)}
            >
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                {nomeUsuario ? nomeUsuario[0].toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <span className="text-xs font-semibold hidden sm:inline">{nomeUsuario || "Perfil"}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>

            {/* Dropdown Menu */}
            {menuAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1 space-y-1">
                  <button
                    onClick={() => { setMenuAberto(false); navigate("/perfil"); }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors"
                  >
                    <User className="w-4 h-4 text-primary" /> Meu Perfil
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sair da Conta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL DA PÁGINA */}
      <main className="flex-1 pb-32 pt-2">
        <Outlet />
      </main>

      {/* 3. NAVBAR INFERIOR (NAVEGAÇÃO RÁPIDA) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 shadow-lg">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
          {eCoordenador ? (
            <>
              <button
                onClick={() => navigate("/painel")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/painel") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-[10px]">Início</span>
              </button>

              <button
                onClick={() => navigate("/chamada")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/chamada") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-[10px]">Chamada</span>
              </button>

              <button
                onClick={() => navigate("/escalas")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/escalas") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-[10px]">Escalas</span>
              </button>

              <button
                onClick={() => navigate("/acolitos")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/acolitos") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-[10px]">Acólitos</span>
              </button>

              <button
                onClick={() => navigate("/avisos")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/avisos") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Bell className="w-5 h-5" />
                <span className="text-[10px]">Avisos</span>
              </button>

              <button
                onClick={() => navigate("/capelas")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/capelas") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Church className="w-5 h-5" />
                <span className="text-[10px]">Capelas</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/perfil")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/perfil") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <User className="w-5 h-5" />
                <span className="text-[10px]">Meu Perfil</span>
              </button>

              <button
                onClick={() => navigate("/escalas")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/escalas") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-[10px]">Escalas</span>
              </button>

              <button
                onClick={() => navigate("/avisos")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/avisos") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Bell className="w-5 h-5" />
                <span className="text-[10px]">Avisos</span>
              </button>

              <button
                onClick={() => navigate("/capelas")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/capelas") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Church className="w-5 h-5" />
                <span className="text-[10px]">Capelas</span>
              </button>
            </>
          )}
        </div>
      </nav>

    </div>
  )
}