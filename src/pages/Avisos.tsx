import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Megaphone, MessageSquare, Share2, Plus, Pin, Trash2 } from "lucide-react"

interface Aviso {
  id: string
  titulo: string
  conteudo: string
  fixado: boolean
  created_at: string
}

interface Coordenador {
  id: string
  nome: string
  numero: string | null
}

export default function Avisos() {
  const [abaAtiva, setAbaAtiva] = useState<'AVISOS' | 'COORDENADORES'>('AVISOS')
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([])
  const [eCoordenador, setECoordenador] = useState(false)
  
  // Modal de Novo Aviso
  const [criandoAviso, setCriandoAviso] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [fixado, setFixado] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDados()
  }, [])

  const fetchDados = async () => {
    // Checa se usuário é coordenador
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      const { data: userAcolito } = await supabase
        .from('acolitos')
        .select('e_coordenador')
        .eq('user_id', authData.user.id)
        .single()
      
      setECoordenador(userAcolito?.e_coordenador ?? false)
    }

    // Busca Avisos
    const { data: avisosData } = await supabase
      .from('avisos')
      .select('*')
      .order('fixado', { ascending: false })
      .order('created_at', { ascending: false })

    if (avisosData) setAvisos(avisosData)

    // Busca Coordenadores
    const { data: coordData } = await supabase
      .from('acolitos')
      .select('id, nome, numero')
      .eq('e_coordenador', true)
      .eq('ativo', true)
      .order('nome')

    if (coordData) setCoordenadores(coordData)
  }

  const handleSalvarAviso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !conteudo) return

    setLoading(true)
    const { error } = await supabase
      .from('avisos')
      .insert([{ titulo, conteudo, fixado }])

    setLoading(false)

    if (!error) {
      setTitulo("")
      setConteudo("")
      setFixado(false)
      setCriandoAviso(false)
      fetchDados()
    } else {
      alert("Erro ao salvar aviso: " + error.message)
    }
  }

  const handleExcluirAviso = async (id: string) => {
    if (!window.confirm("Deseja remover este aviso?")) return
    await supabase.from('avisos').delete().eq('id', id)
    fetchDados()
  }

  const compartilharWhatsApp = (aviso: Aviso) => {
    const texto = `📢 *COMUNICADO - GESTÃO ACÓLITOS*\n\n📌 *${aviso.titulo.toUpperCase()}*\n${aviso.conteudo}\n\n_Publicado em: ${new Date(aviso.created_at).toLocaleDateString('pt-BR')}_`
    navigator.clipboard.writeText(texto)
    alert("Comunicado copiado! Agora é só colar no grupo do WhatsApp.")
  }

  const abrirConversaCoordenador = (coord: Coordenador) => {
    if (!coord.numero) {
      alert("Este coordenador não possui número de telefone cadastrado.")
      return
    }
    const numLimpo = coord.numero.replace(/\D/g, '')
    const msg = encodeURIComponent(`Olá, ${coord.nome}! Sou acólito e gostaria de conversar sobre um assunto referente ao grupo.`)
    window.open(`https://wa.me/55${numLimpo}?text=${msg}`, '_blank')
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      
      {/* SELETOR DE ABAS */}
      <div className="flex bg-muted p-1 rounded-xl gap-1">
        <Button 
          variant={abaAtiva === 'AVISOS' ? 'default' : 'ghost'}
          className="flex-1 text-xs"
          onClick={() => setAbaAtiva('AVISOS')}
        >
          <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Mural de Avisos
        </Button>
        <Button 
          variant={abaAtiva === 'COORDENADORES' ? 'default' : 'ghost'}
          className="flex-1 text-xs"
          onClick={() => setAbaAtiva('COORDENADORES')}
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Falar com Coordenação
        </Button>
      </div>

      {/* ABA 1: MURAL DE AVISOS */}
      {abaAtiva === 'AVISOS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold tracking-tight">Mural de Avisos</h2>
            {eCoordenador && (
              <Button size="sm" onClick={() => setCriandoAviso(!criandoAviso)}>
                <Plus className="w-4 h-4 mr-1" /> Novo Aviso
              </Button>
            )}
          </div>

          {/* FORMULÁRIO DE NOVO AVISO (COORDENADOR) */}
          {criandoAviso && (
            <Card className="border-primary/30 bg-primary/5 shadow-sm">
              <CardContent className="pt-6 space-y-3">
                <form onSubmit={handleSalvarAviso} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Título do Aviso *</Label>
                    <Input 
                      placeholder="Ex: Ensaio para a Semana Santa" 
                      value={titulo} 
                      onChange={(e) => setTitulo(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Conteúdo *</Label>
                    <textarea 
                      rows={3}
                      placeholder="Digite os detalhes do aviso..." 
                      value={conteudo} 
                      onChange={(e) => setConteudo(e.target.value)} 
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required 
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox" 
                      id="fixar" 
                      checked={fixado} 
                      onChange={(e) => setFixado(e.target.checked)} 
                      className="rounded"
                    />
                    <label htmlFor="fixar" className="text-xs font-medium cursor-pointer">
                      Fixar aviso no topo
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" size="sm" className="flex-1" disabled={loading}>
                      {loading ? "Publicando..." : "Publicar Aviso"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCriandoAviso(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* LISTA DE AVISOS */}
          {avisos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum aviso publicado até o momento.</p>
          ) : (
            avisos.map(aviso => (
              <Card key={aviso.id} className={`border-border/50 shadow-sm relative ${aviso.fixado ? 'border-primary/40 bg-primary/5' : ''}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      {aviso.fixado && <Pin className="w-3.5 h-3.5 text-primary fill-primary" />}
                      <h3 className="font-bold text-base">{aviso.titulo}</h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(aviso.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-sm whitespace-pre-line text-muted-foreground">{aviso.conteudo}</p>

                  <div className="flex justify-between items-center pt-2 border-t border-border/30">
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => compartilharWhatsApp(aviso)}>
                      <Share2 className="w-3 h-3 mr-1 text-green-600" /> Copiar p/ WhatsApp
                    </Button>

                    {eCoordenador && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleExcluirAviso(aviso.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ABA 2: TALK TO COORDINATORS */}
      {abaAtiva === 'COORDENADORES' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">Falar com a Coordenação</h2>
            <p className="text-xs text-muted-foreground">
              Precisa tirar alguma dúvida, relatar um problema ou fazer uma justificativa pessoal? Entre em contato diretamente pelo WhatsApp:
            </p>
          </div>

          <div className="space-y-3">
            {coordenadores.map(coord => (
              <Card key={coord.id} className="border-border/50 shadow-sm p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {coord.nome[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{coord.nome}</h3>
                    <span className="text-xs text-primary font-medium">Coordenador</span>
                  </div>
                </div>

                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={() => abrirConversaCoordenador(coord)}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Conversar
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}