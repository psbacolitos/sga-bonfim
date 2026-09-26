import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  User,
  Calendar,
  Clock,
  Church,
  ArrowRightLeft,
  Save,
  KeyRound,
  Award,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface ProximaEscala {
  escala_membro_id: string
  funcao: string
  status_troca: string
  escala: {
    data_escala: string
    horario: string
    observacao: string | null
    capela: { nome_capela: string }
  }
}

export default function Perfil() {
  const navigate = useNavigate()

  // Estado do Acólito
  const [acolitoId, setAcolitoId] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [numero, setNumero] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [endereco, setEndereco] = useState("")
  const [bairro, setBairro] = useState("")
  const [nomeMae, setNomeMae] = useState("")
  const [nomePai, setNomePai] = useState("")

  const [nomeCapela, setNomeCapela] = useState("Carregando...")
  const [strikes, setStrikes] = useState(0)

  // Estatísticas & Escala
  const [totalMissasServidas, setTotalMissasServidas] = useState(0)
  const [proximaEscala, setProximaEscala] = useState<ProximaEscala | null>(null)

  // Troca de Escala / Solicitação
  const [modalTrocaAberto, setModalTrocaAberto] = useState(false)
  const [tipoOperacao, setTipoOperacao] = useState<'DESISTIR' | 'PERMUTA'>('DESISTIR')
  const [funcaoPretendida, setFuncaoPretendida] = useState("Cruz")
  const [loadingTroca, setLoadingTroca] = useState(false)

  // Formulário de Edição
  const [editando, setEditando] = useState(false)
  const [loadingSalvar, setLoadingSalvar] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState("")

  useEffect(() => {
    fetchDadosUsuario()
  }, [])

  const fetchDadosUsuario = async () => {
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      setEmail(authData.user.email || "")

      // 1. Busca os dados completos do acólito
      const { data: acolitoData } = await supabase
        .from('acolitos')
        .select('id, nome, numero, data_nascimento, endereco, bairro, nome_mae, nome_pai, strikes, capela_id')
        .eq('user_id', authData.user.id)
        .single()

      if (acolitoData) {
        setAcolitoId(acolitoData.id)
        setNome(acolitoData.nome || "")
        setNumero(acolitoData.numero || "")
        setDataNascimento(acolitoData.data_nascimento || "")
        setEndereco(acolitoData.endereco || "")
        setBairro(acolitoData.bairro || "")
        setNomeMae(acolitoData.nome_mae || "")
        setNomePai(acolitoData.nome_pai || "")
        setStrikes(acolitoData.strikes || 0)

        // 2. Busca o nome da capela
        if (acolitoData.capela_id) {
          const { data: capelaData } = await supabase
            .from('capelas')
            .select('nome_capela')
            .eq('id', acolitoData.capela_id)
            .single()

          if (capelaData) setNomeCapela(capelaData.nome_capela)
        } else {
          setNomeCapela("Sem Capela Vinculada")
        }

        fetchEstatísticasMissa(acolitoData.id)
        fetchProximaEscala(acolitoData.id)
      }
    }
  }

  const fetchEstatísticasMissa = async (idAcolito: string) => {
    const { count } = await supabase
      .from('escala_membros')
      .select('id', { count: 'exact' })
      .eq('acolito_id', idAcolito)

    if (count !== null) setTotalMissasServidas(count)
  }

  const fetchProximaEscala = async (idAcolito: string) => {
    const hoje = new Date().toLocaleDateString('en-CA')

    const { data } = await supabase
      .from('escala_membros')
      .select(`
        id,
        funcao,
        status_troca,
        escala:escalas!inner(
          data_escala,
          horario,
          observacao,
          capela:capelas(nome_capela)
        )
      `)
      .eq('acolito_id', idAcolito)
      .gte('escala.data_escala', hoje)
      .order('escala(data_escala)', { ascending: true })
      .limit(1)

    if (data && data.length > 0) {
      const item = data[0]
      setProximaEscala({
        escala_membro_id: item.id,
        funcao: item.funcao,
        status_troca: item.status_troca,
        escala: item.escala as any
      })
    }
  }

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acolitoId) return

    setLoadingSalvar(true)
    setMensagemSucesso("")

    const { error } = await supabase
      .from('acolitos')
      .update({
        nome,
        numero: numero || null,
        data_nascimento: dataNascimento || null,
        endereco: endereco || null,
        bairro: bairro || null,
        nome_mae: nomeMae || null,
        nome_pai: nomePai || null
      })
      .eq('id', acolitoId)

    setLoadingSalvar(false)

    if (error) {
      alert("Erro ao atualizar dados: " + error.message)
    } else {
      setMensagemSucesso("Dados atualizados com sucesso!")
      setEditando(false)
    }
  }

  const handleSolicitarAcaoEscala = async () => {
    if (!proximaEscala) return
    setLoadingTroca(true)

    if (tipoOperacao === 'DESISTIR') {
      const { error } = await supabase
        .from('escala_membros')
        .update({
          status_troca: 'SOLICITADA',
          tipo_solicitacao: 'SUBSTITUICAO'
        })
        .eq('id', proximaEscala.escala_membro_id)

      setLoadingTroca(false)

      if (!error) {
        alert("Sua ausência foi informada. A vaga foi liberada para a coordenação remanejar.")
        setModalTrocaAberto(false)
        if (acolitoId) fetchProximaEscala(acolitoId)
      }
    } else {
      const { error } = await supabase
        .from('escala_membros')
        .update({
          status_troca: 'SOLICITADA',
          tipo_solicitacao: 'PERMUTA_FUNCAO',
          funcao_pretendida: funcaoPretendida
        })
        .eq('id', proximaEscala.escala_membro_id)

      setLoadingTroca(false)

      if (!error) {
        alert("Solicitação de troca de função enviada ao coordenador!")
        setModalTrocaAberto(false)
        if (acolitoId) fetchProximaEscala(acolitoId)
      }
    }
  }

  const getBadgeInfo = () => {
    if (totalMissasServidas >= 50) return { icon: "👑", titulo: "Mestre do Altar", desc: "Mais de 50 missas servidas" }
    if (totalMissasServidas >= 25) return { icon: "🥇", titulo: "Guardião do Altar", desc: "Mais de 25 missas servidas" }
    if (totalMissasServidas >= 10) return { icon: "🥈", titulo: "Servidor Fiel", desc: "Mais de 10 missas servidas" }
    return { icon: "🥉", titulo: "Iniciante", desc: "Iniciando a jornada no altar" }
  }

  const badge = getBadgeInfo()

  const calcularIdadeExata = (dataNascimentoStr: string): number | null => {
    if (!dataNascimentoStr) return null

    const [ano, mes, dia] = dataNascimentoStr.split('-').map(Number)
    const hoje = new Date()

    let idade = hoje.getFullYear() - ano
    const mesAtual = hoje.getMonth() + 1
    const diaAtual = hoje.getDate()

    if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
      idade--
    }

    return idade
  }

  const ehAniversarioHoje = (dataNascimentoStr: string): boolean => {
    if (!dataNascimentoStr) return false

    const [, mes, dia] = dataNascimentoStr.split('-').map(Number)
    const hoje = new Date()

    return (hoje.getMonth() + 1) === mes && hoje.getDate() === dia
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">

      {/* BANNER FESTIVO DE ANIVERSÁRIO */}
      {dataNascimento && ehAniversarioHoje(dataNascimento) && (
        <Card className="border-pink-500/40 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 shadow-md">
          <CardContent className="p-4 text-center space-y-2">
            <div className="text-3xl animate-bounce">🎈🥳🎉</div>
            <h3 className="font-black text-lg text-primary tracking-tight">
              Parabéns, {nome.split(" ")[0]}!
            </h3>
            <p className="text-xs text-muted-foreground">
              Que Deus abençoe sua vida e seu serviço ao altar hoje e sempre. O grupo dos acólitos celebra com você!
            </p>
          </CardContent>
        </Card>
      )}

      {/* 1. CABEÇALHO DO PERFIL */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-inner">
                {nome ? nome[0].toUpperCase() : <User className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{nome || "Carregando..."}</h2>
                <span className="text-xs text-muted-foreground block">{email}</span>
                {dataNascimento && (
                  <span className="text-xs text-muted-foreground block">
                    Idade: <strong>{calcularIdadeExata(dataNascimento)} anos</strong>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-1 bg-primary/10 px-2 py-0.5 rounded-full">
                  <Church className="w-3 h-3" /> {nomeCapela}
                </span>
              </div>
            </div>
          </div>

          {mensagemSucesso && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-600 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {mensagemSucesso}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. CARD DE BADGES E ESTATÍSTICAS */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary" /> Conquistas e Serviço
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center flex flex-col justify-center items-center">
              <span className="text-2xl font-black text-primary">{totalMissasServidas}</span>
              <p className="text-xs text-muted-foreground font-medium">Missas Servidas</p>
            </div>

            <div className="bg-muted/30 p-3 rounded-xl border border-border/40 text-center flex flex-col justify-center items-center">
              <span className="text-2xl">{badge.icon}</span>
              <p className="text-xs font-bold text-primary mt-0.5">{badge.titulo}</p>
              <p className="text-[10px] text-muted-foreground">{badge.desc}</p>
            </div>
          </div>

          {strikes > 0 && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Você possui <strong>{strikes} strike(s)</strong> registrado(s). Evite faltas sem justificativa.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. SUA PRÓXIMA ESCALA */}
      <Card className="border-primary/30 bg-primary/5 shadow-sm">
        <CardContent className="pt-6 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Sua Próxima Escala</span>
              <h3 className="text-lg font-bold mt-1">
                {proximaEscala ? proximaEscala.escala.capela?.nome_capela : 'Sem escalas agendadas'}
              </h3>
            </div>
            {proximaEscala && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                {proximaEscala.funcao}
              </span>
            )}
          </div>

          {proximaEscala ? (
            <>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  {new Date(proximaEscala.escala.data_escala + "T00:00:00").toLocaleDateString('pt-BR')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  {proximaEscala.escala.horario.substring(0, 5)}h
                </span>
              </div>

              {proximaEscala.status_troca === 'SOLICITADA' ? (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-2.5 rounded-lg text-xs font-medium text-center mt-2">
                  Solicitação enviada! Aguardando análise da coordenação.
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-primary/20 hover:bg-primary/10 text-xs"
                  onClick={() => setModalTrocaAberto(!modalTrocaAberto)}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Opções da Escala
                </Button>
              )}

              {modalTrocaAberto && (
                <div className="pt-3 border-t border-border/50 space-y-3 bg-card p-3 rounded-lg mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={tipoOperacao === 'DESISTIR' ? 'default' : 'outline'}
                      onClick={() => setTipoOperacao('DESISTIR')}
                      className="text-xs"
                    >
                      Não Poderei Ir
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tipoOperacao === 'PERMUTA' ? 'default' : 'outline'}
                      onClick={() => setTipoOperacao('PERMUTA')}
                      className="text-xs"
                    >
                      Mudar Função
                    </Button>
                  </div>

                  {tipoOperacao === 'PERMUTA' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Deseja servir em qual função?</Label>
                      <select
                        value={funcaoPretendida}
                        onChange={(e) => setFuncaoPretendida(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      >
                        <option value="Altar">Altar</option>
                        <option value="Cruz">Cruz</option>
                        <option value="Turíbulo">Turíbulo</option>
                        <option value="Naveta">Naveta</option>
                        <option value="Credência">Credência</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 text-xs" onClick={handleSolicitarAcaoEscala} disabled={loadingTroca}>
                      {loadingTroca ? "Enviando..." : "Confirmar Solicitação"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setModalTrocaAberto(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Você não está escalado para as próximas missas.</p>
          )}
        </CardContent>
      </Card>

      {/* 4. DADOS PESSOAIS E EDIÇÃO COMPLETA */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" /> Meus Dados Pessoais
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 text-primary"
              onClick={() => setEditando(!editando)}
            >
              {editando ? "Cancelar" : "Editar Dados"}
            </Button>
          </div>

          <form onSubmit={handleSalvarPerfil} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome Completo *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={!editando}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp / Telefone</Label>
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="(88) 9XXXX-XXXX"
                  disabled={!editando}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  disabled={!editando}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Endereço (Rua e Nº)</Label>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua Exemplo, 123"
                  disabled={!editando}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Bairro</Label>
                <Input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Seu bairro"
                  disabled={!editando}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome da Mãe</Label>
                <Input
                  value={nomeMae}
                  onChange={(e) => setNomeMae(e.target.value)}
                  placeholder="Nome completo da mãe"
                  disabled={!editando}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nome do Pai</Label>
                <Input
                  value={nomePai}
                  onChange={(e) => setNomePai(e.target.value)}
                  placeholder="Nome completo do pai"
                  disabled={!editando}
                />
              </div>
            </div>

            {/* Campo de Capela BLOQUEADO */}
            <div className="space-y-1 pt-1">
              <Label className="text-xs text-muted-foreground">Capela Vinculada (Apenas o coordenador pode alterar)</Label>
              <Input
                value={nomeCapela}
                disabled={true}
                className="bg-muted/50 cursor-not-allowed font-medium text-muted-foreground"
              />
            </div>

            {editando && (
              <Button type="submit" size="sm" className="w-full mt-3" disabled={loadingSalvar}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {loadingSalvar ? "Salvando..." : "Salvar Alterações"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 5. ATALHO PARA TELA DE ALTERAR SENHA */}
      <Card
        onClick={() => navigate("/alterar-senha")}
        className="p-4 border-border/50 shadow-sm flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-md">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Segurança da Conta</p>
            <p className="text-xs text-muted-foreground">Alterar sua senha de acesso</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-xs">
          Acessar
        </Button>
      </Card>

    </div>
  )
}