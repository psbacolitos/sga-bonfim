import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent } from "../components/ui/card"
import { Check, X, AlertCircle, Save } from "lucide-react"

interface Acolito {
  id: string
  nome: string
}

type StatusFrequencia = 'PRESENTE' | 'FALTA' | 'JUSTIFICADA'

export default function Chamada() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [acolitos, setAcolitos] = useState<Acolito[]>([])
  const [descricaoEncontro, setDescricaoEncontro] = useState("")

  // Pega a data local de hoje no formato YYYY-MM-DD sem distorção de fuso
  //const hojeLocal = new Date().toLocaleDateString('en-CA') // Retorna no formato YYYY-MM-DD
  const [dataEncontro, setDataEncontro] = useState(Date)

  // Dicionário para guardar o status de cada acólito: { [acolito_id]: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' }
  const [chamadaMap, setChamadaMap] = useState<Record<string, StatusFrequencia>>({})

  useEffect(() => {
    fetchAcolitosAtivos()
  }, [])

  const fetchAcolitosAtivos = async () => {
    const { data } = await supabase
      .from("acolitos")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")

    if (data) {
      setAcolitos(data)
      const mapaInicial: Record<string, StatusFrequencia> = {}
      data.forEach(a => {
        mapaInicial[a.id] = 'PRESENTE'
      })
      setChamadaMap(mapaInicial)
    }
  }

  const alterarStatus = (id: string, status: StatusFrequencia) => {
    setChamadaMap(prev => ({ ...prev, [id]: status }))
  }

  const salvarChamada = async (e: React.FormEvent) => {
    e.preventDefault()
    if (acolitos.length === 0) return

    setLoading(true)

    // 1. Cria o registro do Encontro informando a data escolhida
    const { data: encontroData, error: erroEncontro } = await supabase
      .from("encontros")
      .insert([{ data_encontro: dataEncontro, descricao: descricaoEncontro }])
      .select("id")
      .single()

    if (erroEncontro || !encontroData) {
      alert("Erro ao criar encontro: " + (erroEncontro?.message || "Desconhecido"))
      setLoading(false)
      return
    }

    const encontroId = encontroData.id

    // 2. Prepara a lista de frequências para inserção em lote
    const registrosFrequencia = Object.keys(chamadaMap).map(acolitoId => ({
      encontro_id: encontroId,
      acolito_id: acolitoId,
      status: chamadaMap[acolitoId]
    }))

    const { error: erroFreq } = await supabase
      .from("frequencias")
      .insert(registrosFrequencia)

    setLoading(false)

    if (erroFreq) {
      alert("Erro ao salvar frequências: " + erroFreq.message)
    } else {
      alert("Chamada salva com sucesso! Os strikes (se houverem faltas) foram processados.")
      navigate("/painel")
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={salvarChamada} className="space-y-4">
              
              {/* Ajustado o container para ficar responsivo (1 coluna no mobile, 2 no desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição / Ocasião *</Label>
                  <Input
                    value={descricaoEncontro}
                    onChange={(e) => setDescricaoEncontro(e.target.value)}
                    placeholder="Ex: Missa Solene, Reunião..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data do Encontro *</Label>
                  <Input
                    value={dataEncontro}
                    onChange={(e) => setDataEncontro(e.target.value)}
                    type="date"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Lista de Presença ({acolitos.length} acólitos ativos)
                </h3>

                {acolitos.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum acólito ativo cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {acolitos.map((acolito) => {
                      const statusAtual = chamadaMap[acolito.id] || 'PRESENTE'
                      return (
                        <div key={acolito.id} className="bg-card p-3 rounded-lg border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                          <span className="font-medium text-sm">{acolito.nome}</span>

                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={statusAtual === 'PRESENTE' ? 'default' : 'outline'}
                              className={`flex-1 sm:flex-none text-xs ${statusAtual === 'PRESENTE' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-green-600 border-green-200'}`}
                              onClick={() => alterarStatus(acolito.id, 'PRESENTE')}
                            >
                              <Check className="w-3 h-3 mr-1" /> Presente
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant={statusAtual === 'FALTA' ? 'default' : 'outline'}
                              className={`flex-1 sm:flex-none text-xs ${statusAtual === 'FALTA' ? 'bg-red-600 hover:bg-red-600/90 text-white' : 'text-red-600 border-red-200'}`}
                              onClick={() => alterarStatus(acolito.id, 'FALTA')}
                            >
                              <X className="w-3 h-3 mr-1" /> Falta
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant={statusAtual === 'JUSTIFICADA' ? 'default' : 'outline'}
                              className={`flex-1 sm:flex-none text-xs ${statusAtual === 'JUSTIFICADA' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-amber-600 border-amber-200'}`}
                              onClick={() => alterarStatus(acolito.id, 'JUSTIFICADA')}
                            >
                              <AlertCircle className="w-3 h-3 mr-1" /> Justif.
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading || acolitos.length === 0}>
                <Save className="w-4 h-4 mr-2" /> {loading ? "Salvando Chamada..." : "Finalizar e Salvar Chamada"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}