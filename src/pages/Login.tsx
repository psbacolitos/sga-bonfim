import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"

type ModoAutenticacao = 'LOGIN' | 'CADASTRO' | 'RECUPERAR'

export default function Login() {
  const navigate = useNavigate()
  const [modo, setModo] = useState<ModoAutenticacao>('LOGIN')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  // Formulário
  const [nome, setNome] = useState("")
  const [numero, setNumero] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")

  const handleAutenticacao = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMensagem(null)

    if (modo === 'LOGIN') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      setLoading(false)

      if (error) {
        setMensagem({ tipo: 'erro', texto: "Email ou senha incorretos." })
      } else {
        navigate("/painel")
      }
    }

    else if (modo === 'CADASTRO') {
      if (senha.length < 6) {
        setMensagem({ tipo: 'erro', texto: "A senha deve ter no mínimo 6 caracteres." })
        setLoading(false)
        return
      }

      // 1. Cria a conta no Auth passando Nome e Número nos metadados (options.data)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            numero
          }
        }
      })

      if (signUpError) {
        setLoading(false)
        setMensagem({ tipo: 'erro', texto: "Erro ao criar conta: " + signUpError.message })
        return
      }

      // 2. Faz o login direto do usuário recém-cadastrado
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha })
      setLoading(false)

      if (!loginError) {
        navigate("/painel")
      } else {
        setMensagem({ tipo: 'sucesso', texto: "Conta criada com sucesso! Faça login para continuar." })
        setModo('LOGIN')
      }
    }

    else if (modo === 'RECUPERAR') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/alterar-senha`,
      })

      setLoading(false)

      if (error) {
        setMensagem({ tipo: 'erro', texto: "Erro ao enviar email: " + error.message })
      } else {
        setMensagem({ tipo: 'sucesso', texto: "Email de recuperação enviado!" })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center space-y-2">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 text-primary font-black text-2xl flex items-center justify-center mx-auto shadow-sm">
            SGA
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Acólitos</h1>
          <p className="text-xs text-muted-foreground">Plataforma do Grupo de Acólitos</p>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">

            {mensagem && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 mb-4 ${mensagem.tipo === 'sucesso'
                ? 'bg-green-500/10 border border-green-500/30 text-green-600'
                : 'bg-destructive/10 border border-destructive/30 text-destructive'
                }`}>
                {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{mensagem.texto}</span>
              </div>
            )}

            <form onSubmit={handleAutenticacao} className="space-y-4">

              {modo === 'CADASTRO' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome Completo *</Label>
                    <Input
                      placeholder="Seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">WhatsApp / Telefone *</Label>
                    <Input
                      placeholder="(88) 9XXXX-XXXX"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {modo !== 'RECUPERAR' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Senha *</Label>
                    {modo === 'LOGIN' && (
                      <button
                        type="button"
                        onClick={() => { setModo('RECUPERAR'); setMensagem(null); }}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Processando..." : (
                  modo === 'LOGIN' ? "Entrar na Conta" :
                    modo === 'CADASTRO' ? "Criar Minha Conta" : "Enviar Email de Recuperação"
                )}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="pt-4 border-t border-border/50 text-center mt-4 text-xs text-muted-foreground">
              {modo === 'LOGIN' ? (
                <p>
                  Ainda não tem conta?{" "}
                  <button
                    onClick={() => { setModo('CADASTRO'); setMensagem(null); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Criar Conta
                  </button>
                </p>
              ) : (
                <p>
                  Já tem uma conta cadastrada?{" "}
                  <button
                    onClick={() => { setModo('LOGIN'); setMensagem(null); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Fazer Login
                  </button>
                </p>
              )}
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  )
}