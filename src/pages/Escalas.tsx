import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent } from "../components/ui/card"
import { Calendar, Clock, Plus, Users, Trash2, ArrowLeft, CheckCircle2, XCircle, ArrowRightLeft, Share2, UserMinus } from "lucide-react"

interface Capela {
  id: string
  nome_capela: string
}

interface Acolito {
  id: string
  nome: string
  strikes?: number
}

interface ItemEscalaForm {
  acolito_id: string
  funcao: string
}

interface EscalaCard {
  id: string
  data_escala: string
  horario: string
  observacao: string | null
  capela_id: string
  capela: { nome_capela: string }
  escala_membros: {
    id: string
    funcao: string
    status_troca: string
    tipo_solicitacao: string
    funcao_pretendida?: string
    acolito_id: string
    acolito: { nome: string }
    acolito_substituto?: { nome: string }
  }[]
}

export default function Escalas() {
  const [visao, setVisao] = useState<'LISTA' | 'NOVA' | 'TROCAS'>('LISTA')
  const [loading, setLoading] = useState(false)

  const [capelas, setCapelas] = useState<Capela[]>([])
  const [acolitos, setAcolitos] = useState<Acolito[]>([])
  const [escalas, setEscalas] = useState<EscalaCard[]>([])

  // Formulário Nova Escala
  const [capelaId, setCapelaId] = useState("")
  const [dataEscala, setDataEscala] = useState(new Date().toLocaleDateString('en-CA'))
  const [horario, setHorario] = useState("19:00")
  const [observacao, setObservacao] = useState("")
  const [membrosEscalados, setMembrosEscalados] = useState<ItemEscalaForm[]>([])

  const [acolitoSelecionado, setAcolitoSelecionado] = useState("")
  const [funcaoSelecionada, setFuncaoSelecionada] = useState("Altar")

  // Estado para substituição rápida de vaga aberta no card
  const [substituindoMembroId, setSubstituindoMembroId] = useState<string | null>(null)
  const [novoAcolitoId, setNovoAcolitoId] = useState("")

  useEffect(() => {
    fetchCapelasEAcolitos()
    fetchEscalas()
  }, [])

  const fetchCapelasEAcolitos = async () => {
    const { data: capData } = await supabase.from("capelas").select("id, nome_capela").order("nome_capela")
    if (capData) setCapelas(capData)

    const { data: acoData } = await supabase.from("acolitos").select("id, nome, strikes").eq("ativo", true).order("nome")
    if (acoData) setAcolitos(acoData)
  }

  const fetchEscalas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("escalas")
      .select(`
        id,
        capela_id,
        data_escala,
        horario,
        observacao,
        capela:capelas(nome_capela),
        escala_membros(
          id,
          funcao,
          status_troca,
          tipo_solicitacao,
          funcao_pretendida,
          acolito_id,
          acolito:acolitos!acolito_id(nome),
          acolito_substituto:acolitos!acolito_substituto_id(nome)
        )
      `)
      .order("data_escala", { ascending: true })

    if (!error && data) {
      setEscalas(data as any)
    }
    setLoading(false)
  }

  // --- HELPER PARA FORMATAR DATA SEM PERDER DIA PELO FUSO ---
  const formatarDataBr = (dataStr: string) => {
    if (!dataStr) return ""
    const [ano, mes, dia] = dataStr.split("-")
    return `${dia}/${mes}/${ano}`
  }

  // --- VALIDAÇÃO DE CONFLITOS, REPETIÇÃO E STRIKES ---
  const verificarConflitosEServicoRecente = async (acolitoId: string, capelaIdSel: string, dataEscalaSel: string) => {
    const ac = acolitos.find(a => a.id === acolitoId)
    const alertas: string[] = []

    if (!ac) return alertas

    // 1. Alerta de Strikes
    if ((ac.strikes || 0) >= 2) {
      alertas.push(`⚠️ STRIKES: ${ac.nome} possui ${ac.strikes} strikes acumulados.`)
    }

    // 2. Alerta de Duplicidade no mesmo dia
    const jaEscaladoHoje = escalas.some(e =>
      e.data_escala === dataEscalaSel &&
      e.escala_membros.some(m => m.acolito_id === acolitoId)
    )

    if (jaEscaladoHoje) {
      alertas.push(`⚠️ DUPLICIDADE: ${ac.nome} já está escalado em outra missa na data ${formatarDataBr(dataEscalaSel)}.`)
    }

    // 3. Alerta de Serviço Recente na Mesma Igreja/Capela (Últimos 14 dias)
    const { data: servicosAnteriores } = await supabase
      .from("escala_membros")
      .select(`
        funcao,
        escala:escalas!inner(
          data_escala,
          capela_id,
          capela:capelas(nome_capela)
        )
      `)
      .eq("acolito_id", acolitoId)

    if (servicosAnteriores && servicosAnteriores.length > 0) {
      const [anoSel, mesSel, diaSel] = dataEscalaSel.split('-').map(Number)
      const dataNovaEscala = new Date(anoSel, mesSel - 1, diaSel)

      for (const item of servicosAnteriores) {
        const esc = item.escala as any
        if (!esc) continue

        const [anoAnt, mesAnt, diaAnt] = esc.data_escala.split('-').map(Number)
        const dataAnterior = new Date(anoAnt, mesAnt - 1, diaAnt)

        const diffTempo = dataNovaEscala.getTime() - dataAnterior.getTime()
        const diffDias = Math.floor(diffTempo / (1000 * 3600 * 24))

        // Se serviu na mesma capela nos últimos 14 dias
        if (esc.capela_id === capelaIdSel && diffDias >= 0 && diffDias <= 14) {
          const nomeCapelaServida = esc.capela?.nome_capela || "esta capela"
          alertas.push(
            `ℹ️ REPETIÇÃO: ${ac.nome} já serviu em ${nomeCapelaServida} há ${diffDias} dia(s) (${formatarDataBr(esc.data_escala)}) na função "${item.funcao}".`
          )
          break
        }
      }
    }

    return alertas
  }

  const handleAdicionarMembroForm = async () => {
    if (!acolitoSelecionado) return

    if (!capelaId) {
      alert("Selecione a capela primeiro para podermos verificar o histórico de serviço do acólito.")
      return
    }

    if (membrosEscalados.some(m => m.acolito_id === acolitoSelecionado)) {
      alert("Este acólito já está incluso nesta escala!")
      return
    }

    // Dispara validação completa (Strikes + Duplicidade no Dia + Serviço Recente na Capela)
    const alertas = await verificarConflitosEServicoRecente(acolitoSelecionado, capelaId, dataEscala)
    if (alertas.length > 0) {
      const confirmar = window.confirm(alertas.join("\n\n") + "\n\nDeseja escalar assim mesmo?")
      if (!confirmar) return
    }

    setMembrosEscalados([...membrosEscalados, { acolito_id: acolitoSelecionado, funcao: funcaoSelecionada }])
    setAcolitoSelecionado("")
  }

  const handleSalvarEscala = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!capelaId || membrosEscalados.length === 0) {
      alert("Selecione a capela e adicione pelo menos um acólito.")
      return
    }

    setLoading(true)

    // Grava exatamente a string YYYY-MM-DD
    const { data: escalaData, error: escalaError } = await supabase
      .from("escalas")
      .insert([{ capela_id: capelaId, data_escala: dataEscala, horario, observacao: observacao || null }])
      .select("id")
      .single()

    if (escalaError || !escalaData) {
      alert("Erro ao criar escala: " + escalaError?.message)
      setLoading(false)
      return
    }

    const payloadMembros = membrosEscalados.map(m => ({
      escala_id: escalaData.id,
      acolito_id: m.acolito_id,
      funcao: m.funcao
    }))

    const { error: membrosError } = await supabase.from("escala_membros").insert(payloadMembros)

    setLoading(false)

    if (!membrosError) {
      alert("Escala salva com sucesso!")
      setMembrosEscalados([])
      setObservacao("")
      setVisao('LISTA')
      fetchEscalas()
    }
  }

  // --- EXPORTAR PARA WHATSAPP ---
  const exportarParaWhatsApp = (escala: EscalaCard) => {
    const dataFmt = formatarDataBr(escala.data_escala)
    let texto = `⛪ *ESCALA DE SERVIÇO - ${escala.capela?.nome_capela?.toUpperCase()}*\n`
    texto += `📅 *Data:* ${dataFmt} | ⏰ *Horário:* ${escala.horario.substring(0, 5)}h\n`
    if (escala.observacao) texto += `📝 *Obs:* ${escala.observacao}\n`
    texto += `\n*POSIÇÕES:*\n`

    escala.escala_membros.forEach(m => {
      const statusText = m.status_troca === 'SOLICITADA' && m.tipo_solicitacao === 'SUBSTITUICAO'
        ? '[VAGA ABERTA]'
        : m.acolito?.nome
      texto += `• *${m.funcao}:* ${statusText}\n`
    })

    texto += `\n_Gestão de Acólitos_`

    navigator.clipboard.writeText(texto)
    alert("Escala copiada! Cole diretamente no grupo do WhatsApp.")
  }

  // Substituição direta de vaga aberta pelo coordenador
  const handlePreencherVagaAberta = async (escalaMembroId: string) => {
    if (!novoAcolitoId) return
    setLoading(true)

    await supabase
      .from("escala_membros")
      .update({
        acolito_id: novoAcolitoId,
        status_troca: 'NENHUMA',
        tipo_solicitacao: 'NENHUMA',
        acolito_substituto_id: null
      })
      .eq("id", escalaMembroId)

    setLoading(false)
    setSubstituindoMembroId(null)
    setNovoAcolitoId("")
    fetchEscalas()
  }

  // Responder pedido de permuta (troca de função)
  const handleAprovarPermutaFuncao = async (itemMembroId: string, aprovar: boolean) => {
    setLoading(true)

    if (aprovar) {
      const { data } = await supabase.from("escala_membros").select("funcao_pretendida").eq("id", itemMembroId).single()
      if (data?.funcao_pretendida) {
        await supabase
          .from("escala_membros")
          .update({
            funcao: data.funcao_pretendida,
            funcao_pretendida: null,
            status_troca: 'NENHUMA',
            tipo_solicitacao: 'NENHUMA'
          })
          .eq("id", itemMembroId)
      }
    } else {
      await supabase
        .from("escala_membros")
        .update({ status_troca: 'NENHUMA', tipo_solicitacao: 'NENHUMA', funcao_pretendida: null })
        .eq("id", itemMembroId)
    }

    setLoading(false)
    fetchEscalas()
  }

  const pendenciasPermuta = escalas.flatMap(e =>
    e.escala_membros.filter(m => m.status_troca === 'SOLICITADA' && m.tipo_solicitacao === 'PERMUTA_FUNCAO')
  )

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {visao !== 'LISTA' && (
            <Button variant="ghost" size="icon" onClick={() => setVisao('LISTA')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-xl font-bold tracking-tight">
            {visao === 'LISTA' && 'Escalas de Serviço'}
            {visao === 'NOVA' && 'Nova Escala'}
            {visao === 'TROCAS' && 'Trocas de Função'}
          </h2>
        </div>

        {visao === 'LISTA' && (
          <div className="flex gap-2">
            {pendenciasPermuta.length > 0 && (
              <Button variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20" onClick={() => setVisao('TROCAS')}>
                <ArrowRightLeft className="w-4 h-4 mr-1" /> Permutas ({pendenciasPermuta.length})
              </Button>
            )}
            <Button onClick={() => setVisao('NOVA')}>
              <Plus className="w-4 h-4 mr-1" /> Nova Escala
            </Button>
          </div>
        )}
      </div>

      {/* VISÃO 1: LISTAGEM */}
      {visao === 'LISTA' && (
        <div className="space-y-4">
          {escalas.map(escala => (
            <Card key={escala.id} className="border-border/50 shadow-sm overflow-hidden">
              <div className="bg-primary/5 p-4 border-b border-border/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{escala.capela?.nome_capela}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {formatarDataBr(escala.data_escala)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {escala.horario.substring(0, 5)}h
                    </span>
                  </div>
                </div>

                <Button size="sm" variant="outline" className="text-xs" onClick={() => exportarParaWhatsApp(escala)}>
                  <Share2 className="w-3.5 h-3.5 mr-1 text-green-600" /> WhatsApp
                </Button>
              </div>

              <CardContent className="p-4 space-y-3">
                {escala.observacao && <p className="text-xs italic bg-muted/40 p-2 rounded text-muted-foreground">{escala.observacao}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {escala.escala_membros.map(membro => {
                    const eDesistência = membro.status_troca === 'SOLICITADA' && membro.tipo_solicitacao === 'SUBSTITUICAO'

                    return (
                      <div key={membro.id} className={`p-2.5 rounded-lg border text-sm flex justify-between items-center ${eDesistência ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/20 border-border/30'}`}>
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            {eDesistência ? (
                              <span className="text-amber-600 font-bold flex items-center gap-1">
                                <UserMinus className="w-3.5 h-3.5" /> Vaga Aberta
                              </span>
                            ) : (
                              membro.acolito?.nome
                            )}
                          </p>
                          <span className="text-xs text-primary font-semibold">{membro.funcao}</span>
                        </div>

                        {eDesistência && (
                          <Button size="sm" variant="secondary" className="text-xs h-7 px-2" onClick={() => setSubstituindoMembroId(membro.id)}>
                            Preencher
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Modal Rápido de Preencher Vaga Aberta */}
                {substituindoMembroId && escala.escala_membros.some(m => m.id === substituindoMembroId) && (
                  <div className="p-3 bg-card border border-primary/30 rounded-lg mt-3 space-y-2">
                    <Label className="text-xs font-semibold">Escolher substituto para a vaga:</Label>
                    <div className="flex gap-2">
                      <select
                        value={novoAcolitoId}
                        onChange={(e) => setNovoAcolitoId(e.target.value)}
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                      >
                        <option value="">Selecione o acólito...</option>
                        {acolitos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                      </select>
                      <Button size="sm" className="text-xs" onClick={() => handlePreencherVagaAberta(substituindoMembroId)}>
                        Alocar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSubstituindoMembroId(null)}>
                        X
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VISÃO 2: FORMULÁRIO */}
      {visao === 'NOVA' && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSalvarEscala} className="space-y-4">
              <div className="space-y-2">
                <Label>Capela *</Label>
                <select value={capelaId} onChange={(e) => setCapelaId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">Selecione uma capela</option>
                  {capelas.map(c => <option key={c.id} value={c.id}>{c.nome_capela}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={dataEscala} onChange={(e) => setDataEscala(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Horário *</Label>
                  <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observação (Opcional)</Label>
                <Input placeholder="Ex: Missa Solene de Mães" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </div>

              <div className="border-t border-border/50 pt-4 space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Escalar Acólitos
                </Label>

                <div className="flex gap-2">
                  <select value={acolitoSelecionado} onChange={(e) => setAcolitoSelecionado(e.target.value)} className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione o acólito</option>
                    {acolitos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome} {(a.strikes || 0) >= 2 ? '⚠️ (2+ Strikes)' : ''}
                      </option>
                    ))}
                  </select>

                  <select value={funcaoSelecionada} onChange={(e) => setFuncaoSelecionada(e.target.value)} className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="Altar">Altar</option>
                    <option value="Cruz">Cruz</option>
                    <option value="Turíbulo">Turíbulo</option>
                    <option value="Naveta">Naveta</option>
                    <option value="Credência">Credência</option>
                    <option value="Libras">Libras</option>
                  </select>

                  <Button type="button" onClick={handleAdicionarMembroForm} variant="secondary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  {membrosEscalados.map(item => {
                    const ac = acolitos.find(a => a.id === item.acolito_id)
                    return (
                      <div key={item.acolito_id} className="flex justify-between items-center bg-muted/30 p-2.5 rounded-lg border text-sm">
                        <span>
                          <strong>{ac?.nome}</strong> — <span className="text-primary">{item.funcao}</span>
                          {(ac?.strikes || 0) >= 2 && <span className="text-destructive text-xs font-bold ml-2">⚠️ Strikes</span>}
                        </span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setMembrosEscalados(membrosEscalados.filter(m => m.acolito_id !== item.acolito_id))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Salvando..." : "Publicar Escala"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* VISÃO 3: PERMUTAS */}
      {visao === 'TROCAS' && (
        <div className="space-y-3">
          {pendenciasPermuta.map(item => (
            <Card key={item.id} className="border-amber-200 bg-amber-50/20 p-4 space-y-3">
              <p className="text-sm">
                <strong>{item.acolito?.nome}</strong> pediu para alterar a sua função de <span className="font-bold">{item.funcao}</span> para <span className="font-bold text-primary">{item.funcao_pretendida}</span>.
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAprovarPermutaFuncao(item.id, true)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar Permuta
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => handleAprovarPermutaFuncao(item.id, false)}>
                  <XCircle className="w-4 h-4 mr-1" /> Recusar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}