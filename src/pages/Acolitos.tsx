import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent } from "../components/ui/card"
import { ChevronRight, AlertTriangle, RefreshCcw, History as HistoryIcon, Edit, Power, PowerOff } from "lucide-react"

interface Acolito {
    id: string
    nome: string
    email: string
    numero: string
    capela_id: string | null
    strikes: number
    ativo: boolean
    ultima_escala?: string | null
}

interface HistoricoStrike {
    id: string
    motivo: string
    peso: number
    data_registro: string
}

type Visao = 'LISTA' | 'FORMULARIO' | 'PERFIL'

export default function Acolitos() {
    // const navigate = useNavigate()
    const [visao, setVisao] = useState<Visao>('LISTA')
    const [loading, setLoading] = useState(false)
    const [coordenadorId, setCoordenadorId] = useState<string | null>(null)

    const [acolitos, setAcolitos] = useState<Acolito[]>([])
    const [listaCapelas, setListaCapelas] = useState<any[]>([])
    const [selectedAcolito, setSelectedAcolito] = useState<Acolito | null>(null)
    const [historico, setHistorico] = useState<HistoricoStrike[]>([])
    const [frequenciasRecentes, setFrequenciasRecentes] = useState<Record<string, string[]>>({})

    // Estados do Formulário
    const [nome, setNome] = useState("")
    const [email, setEmail] = useState("")
    const [numero, setNumero] = useState("")
    const [capelaId, setCapelaId] = useState("")

    const [motivoManual, setMotivoManual] = useState("")
    const [pesoManual, setPesoManual] = useState("1")

    const [buscaNome, setBuscaNome] = useState("")
    const [filtroCapela, setFiltroCapela] = useState("")
    const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "ATIVOS" | "INATIVOS">("ATIVOS")

    useEffect(() => {
        fetchListaCapelas()
        fetchCoordenadorLogado()
        fetchAcolitos()
    }, [])

    const fetchListaCapelas = async () => {
        const { data } = await supabase.from('capelas').select('id, nome_capela').order('nome_capela')
        if (data) setListaCapelas(data)
    }

    const fetchCoordenadorLogado = async () => {
        const { data: authData } = await supabase.auth.getUser()
        if (authData.user) {
            const { data } = await supabase.from('acolitos').select('id').eq('user_id', authData.user.id).single()
            if (data) setCoordenadorId(data.id)
        }
    }

    const fetchAcolitos = async () => {
        const { data, error } = await supabase
            .from("acolitos")
            .select("id, nome, email, numero, capela_id, strikes, ativo")
            .order("ativo", { ascending: false })
            .order("nome")

        if (!error && data) {
            // Busca a última escala de cada acólito
            const acolitoIds = data.map(a => a.id)

            const { data: escalasData } = await supabase
                .from('escala_membros')
                .select(`
                    acolito_id,
                    escala:escalas!inner(data_escala)
                `)
                .in('acolito_id', acolitoIds)

            const ultimasEscalasMap: Record<string, string> = {}
            if (escalasData) {
                escalasData.forEach((item: any) => {
                    const dataEsc = item.escala?.data_escala
                    if (dataEsc) {
                        const atual = ultimasEscalasMap[item.acolito_id]
                        if (!atual || new Date(dataEsc) > new Date(atual)) {
                            ultimasEscalasMap[item.acolito_id] = dataEsc
                        }
                    }
                })
            }

            const acolitosComUltimaData = data.map(ac => ({
                ...ac,
                ultima_escala: ultimasEscalasMap[ac.id] || null
            }))

            setAcolitos(acolitosComUltimaData)
            buscarUltimasFrequencias(acolitoIds)
        }
    }

    const buscarUltimasFrequencias = async (acolitoIds: string[]) => {
        if (acolitoIds.length === 0) return

        const { data, error } = await supabase
            .from('frequencias')
            .select('acolito_id, status')
            .in('acolito_id', acolitoIds)

        if (error || !data) return

        const freqMap: Record<string, string[]> = {}

        for (let i = data.length - 1; i >= 0; i--) {
            const freq = data[i]
            if (!freqMap[freq.acolito_id]) freqMap[freq.acolito_id] = []

            if (freqMap[freq.acolito_id].length < 5) {
                freqMap[freq.acolito_id].push(freq.status)
            }
        }

        Object.keys(freqMap).forEach(key => freqMap[key].reverse())
        setFrequenciasRecentes(freqMap)
    }

    const fetchHistorico = async (acolitoId: string) => {
        const { data, error } = await supabase
            .from("historico_strikes")
            .select("id, motivo, peso, data_registro")
            .eq("acolito_id", acolitoId)
            .order("data_registro", { ascending: false })

        if (!error && data) setHistorico(data)
    }

    const abrirPerfil = (acolito: Acolito) => {
        setSelectedAcolito(acolito)
        fetchHistorico(acolito.id)
        setVisao('PERFIL')
    }

    // const prepararNovo = () => {
    //     setSelectedAcolito(null)
    //     setNome(""); setEmail(""); setNumero(""); setCapelaId("")
    //     setVisao('FORMULARIO')
    // }

    const prepararEdicao = () => {
        if (!selectedAcolito) return
        setNome(selectedAcolito.nome || "")
        setEmail(selectedAcolito.email || "")
        setNumero(selectedAcolito.numero || "")
        setCapelaId(selectedAcolito.capela_id || "")
        setVisao('FORMULARIO')
    }

    const voltarParaLista = () => {
        setVisao('LISTA')
        setSelectedAcolito(null)
        fetchAcolitos()
    }

    const handleSalvarFormulario = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload = { nome, email, numero, capela_id: capelaId || null }

        if (selectedAcolito) {
            const { error } = await supabase.from("acolitos").update(payload).eq('id', selectedAcolito.id)
            if (!error) {
                setSelectedAcolito({ ...selectedAcolito, ...payload })
                setVisao('PERFIL')
            } else {
                alert("Erro ao atualizar: " + error.message)
            }
        } else {
            const { error } = await supabase.from("acolitos").insert([payload])
            if (!error) voltarParaLista()
            else alert("Erro ao salvar: " + error.message)
        }

        setLoading(false)
    }

    const handleAlternarStatus = async () => {
        if (!selectedAcolito) return

        const novoStatus = !selectedAcolito.ativo
        const dataInativacao = novoStatus ? null : new Date().toISOString().split('T')[0]
        const mensagem = novoStatus ? "Reativar este acólito?" : "Desativar este acólito?"

        if (!window.confirm(mensagem)) return

        setLoading(true)
        const { error } = await supabase
            .from('acolitos')
            .update({ ativo: novoStatus, data_inativacao: dataInativacao })
            .eq('id', selectedAcolito.id)

        if (!error) {
            setSelectedAcolito({ ...selectedAcolito, ativo: novoStatus })
        }
        setLoading(false)
    }

    const handleStrikeManual = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedAcolito || !coordenadorId) return

        setLoading(true)
        const { error } = await supabase.from('historico_strikes').insert([{
            acolito_id: selectedAcolito.id,
            motivo: motivoManual,
            peso: parseInt(pesoManual),
            coordenador_id: coordenadorId
        }])

        if (!error) {
            alert("Strike manual aplicado!")
            setMotivoManual(""); setPesoManual("1")
            setSelectedAcolito({ ...selectedAcolito, strikes: selectedAcolito.strikes + parseInt(pesoManual) })
            fetchHistorico(selectedAcolito.id)
        }
        setLoading(false)
    }

    const handleZerarStrikes = async () => {
        if (!selectedAcolito || !coordenadorId || selectedAcolito.strikes === 0) return
        if (!window.confirm("Perdoar todos os strikes?")) return

        setLoading(true)
        const { error } = await supabase.rpc('zerar_strikes_acolito', {
            p_acolito_id: selectedAcolito.id,
            p_coordenador_id: coordenadorId,
            p_motivo: 'Perdão manual de ciclo'
        })

        if (!error) {
            alert("Strikes zerados com sucesso!")
            setSelectedAcolito({ ...selectedAcolito, strikes: 0 })
            fetchHistorico(selectedAcolito.id)
        }
        setLoading(false)
    }

    const renderBolinhasFrequencia = (acolitoId: string) => {
        const recentes = frequenciasRecentes[acolitoId] || []
        if (recentes.length === 0) return <span className="text-xs text-muted-foreground opacity-60">Sem dados</span>

        return (
            <div className="flex gap-1 mt-1">
                {recentes.map((status, idx) => {
                    let cor = "bg-green-500"
                    if (status === 'FALTA') cor = "bg-red-500"
                    if (status === 'JUSTIFICADA') cor = "bg-amber-400"
                    return <div key={idx} className={`w-2 h-2 rounded-full ${cor}`} title={status} />
                })}
            </div>
        )
    }

    const acolitosFiltrados = acolitos.filter(acolito => {
        const bateuNome = acolito.nome.toLowerCase().includes(buscaNome.toLowerCase())
        const bateuCapela = filtroCapela === "" || acolito.capela_id === filtroCapela

        let bateuStatus = true
        if (filtroStatus === "ATIVOS") bateuStatus = acolito.ativo
        if (filtroStatus === "INATIVOS") bateuStatus = !acolito.ativo

        return bateuNome && bateuCapela && bateuStatus
    })

    // Função de cálculo de tempo sem servir corrigindo fuso e string YYYY-MM-DD
    const calcularTempoSemServir = (ultimaDataStr: string | null | undefined) => {
        if (!ultimaDataStr) return "Nunca serviu"

        const [ano, mes, dia] = ultimaDataStr.split("-").map(Number)
        const dataUltima = new Date(ano, mes - 1, dia)

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const diffTempo = hoje.getTime() - dataUltima.getTime()
        const diffDias = Math.floor(diffTempo / (1000 * 3600 * 24))

        if (diffDias < 0) return "Escalado em breve"
        if (diffDias === 0) return "Serviu hoje"
        if (diffDias === 1) return "Serviu ontem"
        return `Sem servir há ${diffDias} dias`
    }

    return (
        <div className="min-h-screen bg-background flex flex-col pb-20">
            <main className="flex-1 p-4 max-w-3xl mx-auto w-full">

                {visao === 'LISTA' && (
                    <div className="space-y-3 mb-4">
                        <Input
                            placeholder="Pesquisar acólito por nome..."
                            value={buscaNome}
                            onChange={(e) => setBuscaNome(e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={filtroCapela}
                                onChange={(e) => setFiltroCapela(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Todas as Capelas</option>
                                {listaCapelas.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome_capela}</option>
                                ))}
                            </select>

                            <select
                                value={filtroStatus}
                                onChange={(e) => setFiltroStatus(e.target.value as any)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="ATIVOS">Apenas Ativos</option>
                                <option value="INATIVOS">Apenas Inativos</option>
                                <option value="TODOS">Todos os Status</option>
                            </select>
                        </div>
                    </div>
                )}

                {visao === 'LISTA' && (
                    <div className="space-y-3">
                        {acolitos.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">Nenhum acólito cadastrado.</div>
                        ) : (
                            acolitosFiltrados.map((acolito) => (
                                <Card
                                    key={acolito.id}
                                    onClick={() => abrirPerfil(acolito)}
                                    className={`border-border/50 shadow-sm flex items-center justify-between p-4 cursor-pointer transition-colors ${acolito.ativo ? 'hover:bg-accent/10' : 'bg-muted/30 opacity-75'}`}
                                >
                                    <div className="flex-1">
                                        <h3 className={`font-semibold ${!acolito.ativo && 'text-muted-foreground line-through'}`}>
                                            {acolito.nome}
                                        </h3>
                                        {renderBolinhasFrequencia(acolito.id)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${!acolito.ultima_escala
                                            ? 'bg-muted text-muted-foreground'
                                            : (new Date().getTime() - new Date(acolito.ultima_escala).getTime()) / (1000 * 3600 * 24) > 30
                                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                                                : 'bg-emerald-500/10 text-emerald-600'
                                            }`}>
                                            {calcularTempoSemServir(acolito.ultima_escala)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`flex flex-col items-center justify-center rounded-md px-3 py-1 ${acolito.ativo ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                            <span className="text-lg font-bold leading-none">{acolito.strikes}</span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50" />
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {visao === 'FORMULARIO' && (
                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="pt-6">
                            <form onSubmit={handleSalvarFormulario} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome Completo *</Label>
                                    <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Celular (WhatsApp)</Label>
                                    <Input placeholder="(00) 00000-0000" value={numero} onChange={(e) => setNumero(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Capela</Label>
                                    <select
                                        value={capelaId}
                                        onChange={(e) => setCapelaId(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Selecione uma capela (Opcional)</option>
                                        {listaCapelas.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nome_capela}</option>
                                        ))}
                                    </select>
                                </div>
                                <Button type="submit" className="w-full mt-4" disabled={loading}>
                                    {loading ? "Salvando..." : "Salvar"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {visao === 'PERFIL' && selectedAcolito && (
                    <div className="space-y-6">
                        <div className={`flex items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm ${!selectedAcolito.ativo && 'opacity-75 bg-muted/20'}`}>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold">{selectedAcolito.nome}</h2>
                                    {!selectedAcolito.ativo && <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Inativo</span>}
                                </div>
                                <p className="text-sm text-muted-foreground">{selectedAcolito.numero || 'Sem contato'}</p>
                                <div className="mt-2">{renderBolinhasFrequencia(selectedAcolito.id)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-black text-destructive leading-none">{selectedAcolito.strikes}</div>
                                <div className="text-xs uppercase font-bold text-muted-foreground">Strikes</div>
                            </div>
                        </div>

                        {selectedAcolito.numero && (
                            <Button
                                variant="outline"
                                className="w-full bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                onClick={() => {
                                    const numeroLimpo = selectedAcolito.numero.replace(/\D/g, '')
                                    const mensagem = encodeURIComponent(
                                        `Olá, ${selectedAcolito.nome}! Tudo bem? A coordenação dos Acólitos gostaria de conversar sobre a sua frequência nos últimos encontros.`
                                    )
                                    window.open(`https://wa.me/55${numeroLimpo}?text=${mensagem}`, '_blank')
                                }}
                            >
                                Enviar Mensagem no WhatsApp
                            </Button>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={prepararEdicao} disabled={loading}>
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                            <Button
                                variant={selectedAcolito.ativo ? "destructive" : "default"}
                                className="flex-1"
                                onClick={handleAlternarStatus}
                                disabled={loading}
                            >
                                {selectedAcolito.ativo ? <><PowerOff className="w-4 h-4 mr-2" /> Desativar</> : <><Power className="w-4 h-4 mr-2" /> Reativar</>}
                            </Button>
                        </div>

                        {selectedAcolito.ativo && (
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                    onClick={handleZerarStrikes}
                                    disabled={selectedAcolito.strikes === 0 || loading}
                                >
                                    <RefreshCcw className="w-4 h-4 mr-2" /> Perdoar Strikes
                                </Button>
                            </div>
                        )}

                        {selectedAcolito.ativo && (
                            <Card className="border-destructive/20 shadow-sm bg-destructive/5">
                                <CardContent className="pt-6">
                                    <h3 className="flex items-center text-destructive font-semibold mb-4">
                                        <AlertTriangle className="w-4 h-4 mr-2" /> Aplicar Punição Manual
                                    </h3>
                                    <form onSubmit={handleStrikeManual} className="space-y-3">
                                        <div className="space-y-2">
                                            <Label>Motivo da Punição</Label>
                                            <Input placeholder="Ex: Desobediência grave..." value={motivoManual} onChange={(e) => setMotivoManual(e.target.value)} required />
                                        </div>
                                        <div className="flex gap-3 items-end">
                                            <div className="space-y-2 w-24">
                                                <Label>Peso</Label>
                                                <Input type="number" min="1" max="10" value={pesoManual} onChange={(e) => setPesoManual(e.target.value)} required />
                                            </div>
                                            <Button type="submit" variant="default" className="flex-1 bg-destructive text-white" disabled={loading}>
                                                Lançar Strike
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-3">
                            <h3 className="flex items-center text-lg font-semibold px-1">
                                <HistoryIcon className="w-5 h-5 mr-2 text-primary" /> Histórico de Ocorrências
                            </h3>

                            {historico.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic px-1">Nenhum registro encontrado.</p>
                            ) : (
                                historico.map(reg => (
                                    <div key={reg.id} className="bg-card p-3 rounded-lg border border-border/50 text-sm flex justify-between items-center shadow-sm">
                                        <div>
                                            <p className="font-medium">{reg.motivo}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(reg.data_registro).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <span className={`font-bold px-2 py-1 rounded-md ${reg.peso > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'}`}>
                                            {reg.peso > 0 ? `+${reg.peso}` : reg.peso}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                )}
            </main>
        </div>
    )
}