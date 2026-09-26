import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { User, KeyRound, CheckCircle2 } from "lucide-react"

export default function AlterarSenha() {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState("")

  useEffect(() => {
    fetchDadosUsuario()
  }, [])

  const fetchDadosUsuario = async () => {
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      setEmail(authData.user.email || "")
      const { data } = await supabase
        .from('acolitos')
        .select('nome')
        .eq('user_id', authData.user.id)
        .single()
      if (data) setNome(data.nome)
    }
  }

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensagemSucesso("")

    if (novaSenha.length < 6) {
      alert("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }

    if (novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem!")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setLoading(false)

    if (error) {
      alert("Erro ao alterar senha: " + error.message)
    } else {
      setMensagemSucesso("Senha alterada com sucesso!")
      setNovaSenha("")
      setConfirmarSenha("")
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {nome ? nome[0].toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{nome || "Carregando..."}</h2>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" /> Alterar Senha
            </h3>

            {mensagemSucesso && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {mensagemSucesso}
              </div>
            )}

            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input 
                type="password" 
                value={novaSenha} 
                onChange={(e) => setNovaSenha(e.target.value)} 
                placeholder="Mínimo 6 caracteres"
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input 
                type="password" 
                value={confirmarSenha} 
                onChange={(e) => setConfirmarSenha(e.target.value)} 
                placeholder="Repita a nova senha"
                required 
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}