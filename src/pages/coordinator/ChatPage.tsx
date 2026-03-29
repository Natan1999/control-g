import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, Smile, Search, MoreVertical, Phone, Video, Users, Circle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper, Avatar } from '@/components/shared'
import { useAuthStore } from '@/stores/authStore'
import { formatRelativeTime } from '@/lib/utils'

interface Message {
  id: string
  senderId: string
  senderName: string
  text: string
  time: string
  mine: boolean
}

interface Conversation {
  id: string
  name: string
  role: string
  lastMsg: string
  time: string
  unread: number
  online: boolean
}

const convs: Conversation[] = [
  { id: '1', name: 'Ana García', role: 'Técnico · El Pozón', lastMsg: 'Completé el sector 4B...', time: '10:32', unread: 2, online: true },
  { id: '2', name: 'Carlos Mendoza', role: 'Asistente', lastMsg: 'Revisa el formulario #247', time: '09:15', unread: 0, online: true },
  { id: '3', name: 'Pedro Suárez', role: 'Técnico · La Boquilla', lastMsg: 'Sin señal, vuelvo al...', time: 'ayer', unread: 0, online: false },
  { id: '4', name: 'Equipo Campo', role: 'Grupo · 12 miembros', lastMsg: 'Reunión mañana 7am', time: 'ayer', unread: 5, online: false },
  { id: '5', name: 'Sofía Herrera', role: 'Técnico · Nelson M.', lastMsg: 'Ok perfecto 👍', time: 'mar', unread: 0, online: false },
]

const sampleMsgs: Message[] = [
  { id: '1', senderId: 'other', senderName: 'Ana García', text: 'Coordinadora, ya completé el sector 4B del pozón. Total 38 formularios diligenciados.', time: '10:28', mine: false },
  { id: '2', senderId: 'me', senderName: 'Yo', text: 'Excelente Ana! ¿Tuviste problemas con el campo de geolocalización?', time: '10:29', mine: true },
  { id: '3', senderId: 'other', senderName: 'Ana García', text: 'Sí, en algunas manzanas el GPS tardaba mucho. Activé el modo manual y funcionó bien.', time: '10:31', mine: false },
  { id: '4', senderId: 'me', senderName: 'Yo', text: 'Bien manejado. Para el sector 5A ten en cuenta que algunas casas están numeradas diferente al mapa.', time: '10:31', mine: true },
  { id: '5', senderId: 'other', senderName: 'Ana García', text: 'Entendido. También hay una familia que quiere hablar con el coordinador sobre el proceso.', time: '10:32', mine: false },
]

export default function ChatPage() {
  const { user } = useAuthStore()
  const [active, setActive] = useState(convs[0])
  const [messages, setMessages] = useState<Message[]>(sampleMsgs)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      senderId: 'me',
      senderName: user?.fullName || 'Yo',
      text: input.trim(),
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      mine: true,
    }])
    setInput('')
  }

  const filtered = convs.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageWrapper>
      <TopBar title="Chat del Equipo" subtitle="Comunicación en tiempo real con técnicos y asistentes" />
      <div className="flex h-[calc(100vh-73px)]">

        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversaciones..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(conv => (
              <button key={conv.id} onClick={() => setActive(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border/50 ${active.id === conv.id ? 'bg-muted/70' : ''}`}>
                <div className="relative flex-shrink-0">
                  <Avatar name={conv.name} size="sm" />
                  {conv.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold truncate">{conv.name}</span>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{conv.lastMsg}</div>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar name={active.name} size="sm" />
                {active.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">{active.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {active.online && <Circle size={8} className="text-green-500 fill-green-500" />}
                  {active.online ? 'En línea' : 'Offline'} · {active.role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors"><Phone size={16} className="text-muted-foreground" /></button>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors"><Video size={16} className="text-muted-foreground" /></button>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors"><MoreVertical size={16} className="text-muted-foreground" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/20">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.mine ? 'flex-row-reverse' : ''}`}>
                  {!msg.mine && <Avatar name={msg.senderName} size="sm" />}
                  <div className={`max-w-[65%] ${msg.mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.mine
                        ? 'bg-brand-primary text-white rounded-tr-sm'
                        : 'bg-white border border-border text-foreground rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 bg-card border-t border-border">
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-muted rounded-xl transition-colors"><Paperclip size={18} className="text-muted-foreground" /></button>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
              <button className="p-2 hover:bg-muted rounded-xl transition-colors"><Smile size={18} className="text-muted-foreground" /></button>
              <button onClick={send}
                className="w-10 h-10 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl flex items-center justify-center transition-colors">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
