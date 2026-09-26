import { useEffect, useState, type JSX } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabase"

import Login from "./pages/Login"
import Layout from "./components/Layout"
import Painel from "./pages/Painel"
import Acolitos from "./pages/Acolitos"
import Chamada from "./pages/Chamada"
import Capelas from "./pages/Capelas"
import Encontros from "./pages/Encontros"
import Perfil from "./pages/Perfil"
import Escalas from "./pages/Escalas"
import Avisos from "./pages/Avisos"
import AlterarSenha from "./pages/AlterarSenha"

// 1. Guarda Geral: Verifica se está logado
function RotaPrivada({ children }: { children: JSX.Element }) {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAutenticado(!!session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (autenticado === null) return <div className="min-h-screen bg-background"></div>
  return autenticado ? children : <Navigate to="/login" replace />
}

// 2. Guarda de Coordenador: Bloqueia acesso direto por URL
function RotaCoordenador({ children }: { children: JSX.Element }) {
  const [eCoordenador, setECoordenador] = useState<boolean | null>(null)

  useEffect(() => {
    const checarPermissao = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        const { data } = await supabase
          .from('acolitos')
          .select('e_coordenador')
          .eq('user_id', authData.user.id)
          .single()

        setECoordenador(data?.e_coordenador ?? false)
      } else {
        setECoordenador(false)
      }
    }

    checarPermissao()
  }, [])

  if (eCoordenador === null) return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Verificando permissões...</div>
  
  // Se for coordenador abre a página, senão chuta de volta para o perfil dele
  return eCoordenador ? children : <Navigate to="/perfil" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* ROTAS DENTRO DO LAYOUT */}
        <Route element={<RotaPrivada><Layout /></RotaPrivada>}>
        {/* <Route path="/avisos" element={<RotaPrivada><Avisos /></RotaPrivada>} /> */}
          
          {/* Rotas Exclusivas da Coordenação */}
          <Route path="/painel" element={<RotaCoordenador><Painel /></RotaCoordenador>} />
          <Route path="/acolitos" element={<RotaCoordenador><Acolitos /></RotaCoordenador>} />
          <Route path="/chamada" element={<RotaCoordenador><Chamada /></RotaCoordenador>} />
          <Route path="/encontros" element={<RotaCoordenador><Encontros /></RotaCoordenador>} />
          <Route path="/escalas" element={<RotaCoordenador><Escalas /></RotaCoordenador>} />

          {/* Rotas Compartilhadas (Acólitos e Coordenadores podem ver) */}
          <Route path="/capelas" element={<Capelas />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/alterar-senha" element={<AlterarSenha />} />
          <Route path="/avisos" element={<Avisos />} />

        </Route>
      </Routes>
    </BrowserRouter>
  )
}