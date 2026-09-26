import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Users, Church, AlertTriangle, UserCheck, Plus, ArrowRight, Calendar, AlertCircle } from "lucide-react"

export default function Painel() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({
    total_ativos: 0,
    total_inativos: 0,
    total_capelas: 0,
    em_alerta: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    checarPerfil()
  }, [])

  const fetchMetrics = async () => {
    const { data, error } = await supabase.rpc('get_dashboard_metrics')
    if (!error && data && data.length > 0) {
      setMetrics(data[0])
    }
    setLoading(false)
  }

  // Adicione o estado para controlar se o perfil está incompleto
  const [perfilIncompleto, setPerfilIncompleto] = useState(false)

  // Dentro do seu useEffect / fetchDados do Painel:
  const checarPerfil = async () => {
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      const { data } = await supabase
        .from('acolitos')
        .select('data_nascimento, endereco, nome_mae, numero') // adicionado numero
        .eq('user_id', authData.user.id)
        .maybeSingle() // usando maybeSingle para evitar erro se não encontrar

      // Se algum dos dados obrigatórios estiver ausente, ativa o banner
      if (data && (!data.data_nascimento || !data.endereco || !data.nome_mae || !data.numero)) {
        setPerfilIncompleto(true)
      }
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      {perfilIncompleto && (
        <Card className="border-amber-500/40 bg-amber-500/10 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Perfil Incompleto</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  Preencha sua data de nascimento, endereço e dados de filiação.
                </p>
              </div>
            </div>
            <Button size="sm" className="text-xs shrink-0" onClick={() => navigate("/perfil")}>
              Completar
            </Button>
          </CardContent>
        </Card>
      )}
      {/* BOAS-VINDAS / CARD PRINCIPAL */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Painel do Coordenador</h2>
          <p className="text-sm text-muted-foreground">Resumo geral das atividades do grupo.</p>
        </div>
        <Button onClick={() => navigate("/chamada")} className="w-full sm:w-auto shadow-sm">
          <UserCheck className="w-4 h-4 mr-2" /> Iniciar Chamada
        </Button>
      </div>

      {/* GRADE DE MÉTRICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-2">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold">{loading ? "..." : metrics.total_ativos}</span>
            <span className="text-xs text-muted-foreground font-medium">Acólitos Ativos</span>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mb-2">
              <Church className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold">{loading ? "..." : metrics.total_capelas}</span>
            <span className="text-xs text-muted-foreground font-medium">Capelas</span>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-destructive/10 text-destructive rounded-lg mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-destructive">{loading ? "..." : metrics.em_alerta}</span>
            <span className="text-xs text-muted-foreground font-medium">Em Alerta (2+ Strikes)</span>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="p-2 bg-muted text-muted-foreground rounded-lg mb-2">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-muted-foreground">{loading ? "..." : metrics.total_inativos}</span>
            <span className="text-xs text-muted-foreground font-medium">Inativos</span>
          </CardContent>
        </Card>

      </div>

      {/* ATALHOS RÁPIDOS */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Ações Rápidas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            onClick={() => navigate("/acolitos")}
            className="p-4 border-border/50 shadow-sm flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-md">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Gerenciar e Cadastrar Acólitos</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Card>

          <Card
            onClick={() => navigate("/capelas")}
            className="p-4 border-border/50 shadow-sm flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-md">
                <Church className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Ver e Cadastrar Capelas</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Card>
          <Card
            onClick={() => navigate("/escalas")}
            className="p-4 border-border/50 shadow-sm flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-md">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm">Escalas de Serviço</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Card>
        </div>
      </div>

    </div>
  )
}