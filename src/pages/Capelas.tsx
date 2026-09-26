import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent } from "../components/ui/card"
import { Church, ChevronRight, Edit, Users, Calendar, Clock } from "lucide-react"

interface Capela {
  id: string
  nome_capela: string
  festejos_padroeiro: string | null
  horarios_missa: string | null
  coordenador_id: string | null
  coordenador?: { nome: string }
}

interface AcolitoVinculado {
  id: string
  nome: string
  ativo: boolean
}

type Visao = 'LISTA' | 'FORMULARIO' | 'PERFIL'

export default function Capelas() {
  const [visao, setVisao] = useState<Visao>('LISTA')
  const [loading, setLoading] = useState(false)

  const [capelas, setCapelas] = useState<Capela[]>([])
  const [selectedCapela, setSelectedCapela] = useState<Capela | null>(null)
  const [membros, setMembros] = useState<AcolitoVinculado[]>([])
  const [todosAcolitos, setTodosAcolitos] = useState<{id: string, nome: string}[]>([])

  // Campos do Formulário
  const [nomeCapela, setNomeCapela] = useState("")
  const [festejos, setFestejos] = useState("")
  const [horarios, setHorarios] = useState("")
  const [coordenadorId, setCoordenadorId] = useState("")

  useEffect(() => {
    fetchCapelas()
    fetchTodosAcolitos()
  }, [])

  const fetchCapelas = async () => {
    // Busca as capelas e tenta puxar o nome do coordenador via relacionamento
    const { data } = await supabase
      .from("capelas")
      .select(`
        *,
        coordenador:acolitos!coordenador_id(nome)
      `)
      .order("nome_capela")
    
    if (data) setCapelas(data as any)
  }

  const fetchTodosAcolitos = async () => {
    const { data } = await supabase.from("acolitos").select("id, nome").eq("ativo", true).order("nome")
    if (data) setTodosAcolitos(data)
  }

  const abrirPerfil = async (capela: Capela) => {
    setSelectedCapela(capela)
    setVisao('PERFIL')
    
    // Busca quem são os acólitos que têm esta capela_id
    const { data } = await supabase
      .from("acolitos")
      .select("id, nome, ativo")
      .eq("capela_id", capela.id)
      .order("ativo", { ascending: false })
      .order("nome")
      
    if (data) setMembros(data)
  }

  const prepararEdicao = () => {
    if (!selectedCapela) return
    setNomeCapela(selectedCapela.nome_capela || "")
    setFestejos(selectedCapela.festejos_padroeiro || "")
    setHorarios(selectedCapela.horarios_missa || "")
    setCoordenadorId(selectedCapela.coordenador_id || "")
    setVisao('FORMULARIO')
  }

  const voltarParaLista = () => {
    setVisao('LISTA')
    setSelectedCapela(null)
    setMembros([])
    fetchCapelas()
  }

  const handleSalvarFormulario = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = { 
      nome_capela: nomeCapela, 
      festejos_padroeiro: festejos || null, 
      horarios_missa: horarios || null, 
      coordenador_id: coordenadorId || null 
    }

    if (selectedCapela) {
      const { error } = await supabase.from("capelas").update(payload).eq('id', selectedCapela.id)
      if (!error) {
        // Atualiza estado local mantendo o nome do coordenador atualizado se possível
        const novoCoordenador = todosAcolitos.find(a => a.id === coordenadorId)
        setSelectedCapela({ 
          ...selectedCapela, 
          ...payload, 
          coordenador: novoCoordenador ? { nome: novoCoordenador.nome } : undefined 
        })
        setVisao('PERFIL')
      } else {
        alert("Erro ao atualizar: " + error.message)
      }
    } else {
      const { error } = await supabase.from("capelas").insert([payload])
      if (!error) voltarParaLista()
      else alert("Erro ao salvar: " + error.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        
        {visao === 'LISTA' && (
          <div className="space-y-3">
            {capelas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Nenhuma capela cadastrada.</div>
            ) : (
              capelas.map((capela) => (
                <Card 
                  key={capela.id} 
                  onClick={() => abrirPerfil(capela)}
                  className="p-4 border-border/50 shadow-sm flex items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full text-primary">
                      <Church className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{capela.nome_capela}</h3>
                      <p className="text-sm text-muted-foreground">
                        Coord: {capela.coordenador?.nome || 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50" />
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
                  <Label>Nome da Capela *</Label>
                  <Input value={nomeCapela} onChange={(e) => setNomeCapela(e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <Label>Coordenador Responsável</Label>
                  <select 
                    value={coordenadorId} 
                    onChange={(e) => setCoordenadorId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Nenhum coordenador definido</option>
                    {todosAcolitos.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Festejos do Padroeiro</Label>
                  <Input placeholder="Ex: De 10 a 19 de Março" value={festejos} onChange={(e) => setFestejos(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Dias e Horários de Missa</Label>
                  <Input placeholder="Ex: Domingos às 08h e 19h" value={horarios} onChange={(e) => setHorarios(e.target.value)} />
                </div>

                <Button type="submit" className="w-full mt-4" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Capela"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {visao === 'PERFIL' && selectedCapela && (
          <div className="space-y-6">
            
            <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm text-center space-y-2">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary mb-2">
                <Church className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">{selectedCapela.nome_capela}</h2>
              <p className="text-sm font-medium text-primary">
                Coordenador: {selectedCapela.coordenador?.nome || 'Não definido'}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={prepararEdicao}>
              <Edit className="w-4 h-4 mr-2" /> Editar Informações
            </Button>
            
            <Card className="border-border/50 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Festejos do Padroeiro</p>
                    <p className="text-sm text-muted-foreground">{selectedCapela.festejos_padroeiro || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Horários de Missa</p>
                    <p className="text-sm text-muted-foreground">{selectedCapela.horarios_missa || 'Não informado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="flex items-center text-lg font-semibold px-1">
                <Users className="w-5 h-5 mr-2 text-primary" /> Acólitos Vinculados ({membros.length})
              </h3>
              
              {membros.length === 0 ? (
                <p className="text-sm text-muted-foreground italic px-1">Nenhum acólito vinculado a esta capela.</p>
              ) : (
                <div className="grid gap-2">
                  {membros.map(membro => (
                    <div key={membro.id} className={`bg-card p-3 rounded-lg border border-border/50 text-sm flex justify-between items-center shadow-sm ${!membro.ativo && 'opacity-60 bg-muted/30'}`}>
                      <span className={`font-medium ${!membro.ativo && 'line-through text-muted-foreground'}`}>
                        {membro.nome}
                      </span>
                      {!membro.ativo && <span className="text-[10px] uppercase font-bold text-muted-foreground">Inativo</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}