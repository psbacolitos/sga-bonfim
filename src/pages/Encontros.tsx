import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Calendar, ChevronRight, Check, X, AlertCircle, Copy } from "lucide-react"

interface Encontro {
  id: string
  descricao: string
  data_encontro: string
}

interface FrequenciaDetalhe {
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA'
  acolito: {
    nome: string
  }
}

type Visao = 'LISTA' | 'DETALHES'

export default function Encontros() {
  const [visao, setVisao] = useState<Visao>('LISTA')
  const [encontros, setEncontros] = useState<Encontro[]>([])
  const [selectedEncontro, setSelectedEncontro] = useState<Encontro | null>(null)
  const [frequencias, setFrequencias] = useState<FrequenciaDetalhe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEncontros()
  }, [])

  const fetchEncontros = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('encontros')
      .select('id, descricao, data_encontro')
      .order('data_encontro', { ascending: false })

    if (data) setEncontros(data)
    setLoading(false)
  }

  const abrirDetalhes = async (encontro: Encontro) => {
    setSelectedEncontro(encontro)
    setVisao('DETALHES')

    // Busca a lista de presença fazendo um JOIN com a tabela de acólitos para pegar os nomes
    const { data } = await supabase
      .from('frequencias')
      .select(`
        status,
        acolito:acolitos(nome)
      `)
      .eq('encontro_id', encontro.id)

    if (data) setFrequencias(data as any)
  }

  // Auxiliar para renderizar o ícone e a cor do status
  const renderStatus = (status: string) => {
    if (status === 'PRESENTE') return <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-bold"><Check className="w-3 h-3 mr-1" /> PRESENTE</span>
    if (status === 'FALTA') return <span className="flex items-center text-destructive bg-destructive/10 px-2 py-1 rounded-md text-xs font-bold"><X className="w-3 h-3 mr-1" /> FALTA</span>
    return <span className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold"><AlertCircle className="w-3 h-3 mr-1" /> JUSTIFICOU</span>
  }
  const copiarResumoWhatsApp = () => {
    if (!selectedEncontro) return

    const presentes = frequencias.filter(f => f.status === 'PRESENTE').length
    const faltas = frequencias.filter(f => f.status === 'FALTA').length
    const justificadas = frequencias.filter(f => f.status === 'JUSTIFICADA').length

    const dataFormatada = new Date(selectedEncontro.data_encontro).toLocaleDateString('pt-BR')

    const texto = `📌 *RESUMO DO ENCONTRO*
    📅 *Data:* ${dataFormatada}
    📖 *Evento:* ${selectedEncontro.descricao}

    ✅ *Presentes:* ${presentes}
    ❌ *Faltas:* ${faltas}
    ⚠️ *Justificativas:* ${justificadas}`

    navigator.clipboard.writeText(texto)
    alert("Resumo copiado! Agora é só colar no grupo do WhatsApp.")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* <header className="border-b border-border/50 bg-card p-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => visao === 'LISTA' ? navigate("/painel") : voltarParaLista()}>
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Button>
        <h1 className="text-xl font-bold text-primary tracking-tight">
          {visao === 'LISTA' ? 'Histórico de Encontros' : 'Lista de Presença'}
        </h1>
      </header> */}

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {visao === 'LISTA' && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground mt-10">Carregando...</p>
            ) : encontros.length === 0 ? (
              <p className="text-center text-muted-foreground mt-10">Nenhum encontro registrado.</p>
            ) : (
              encontros.map((encontro) => (
                <Card
                  key={encontro.id}
                  onClick={() => abrirDetalhes(encontro)}
                  className="p-4 border-border/50 shadow-sm flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{encontro.descricao}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(encontro.data_encontro).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50" />
                </Card>
              ))
            )}
          </div>
        )}

        {visao === 'DETALHES' && selectedEncontro && (
          <div className="space-y-6">
            <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm text-center space-y-1">
              <h2 className="text-lg font-bold">{selectedEncontro.descricao}</h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" /> {new Date(selectedEncontro.data_encontro).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold px-1 text-sm text-muted-foreground uppercase tracking-wider">
                Registros ({frequencias.length})
              </h3>

              {frequencias.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhuma frequência salva para este encontro.</p>
              ) : (
                frequencias.map((freq, idx) => (
                  <Card key={idx} className="p-3 border-border/50 shadow-sm flex items-center justify-between">
                    <span className="font-medium text-sm">{freq.acolito.nome}</span>
                    {renderStatus(freq.status)}
                  </Card>
                ))
              )}
            </div>
            <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm text-center space-y-1">
              <Button variant="ghost" size="icon" onClick={() => copiarResumoWhatsApp()}>
                <Copy className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm"> Copiar resumo do encontro</span>
              </Button></div>
          </div>

        )}
      </main>
    </div>
  )
}