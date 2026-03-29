import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, Search, Circle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper, Avatar } from '@/components/shared'
import { useAuthStore } from '@/stores/authStore'

const convs = [
  { id: '1', name: 'María Rodríguez', role: 'Coordinadora', lastMsg: '¿Cómo va El Pozón hoy?', time: '10:40', unread: 1, online: true },
  { id: '2', name: 'Ana García', role: 'Técnico · El Pozón', lastMsg: 'Completé el sector B', time: '10:32', unread: 0, online: true },
  { id: '3', name: 'Equipo Campo', role: 'Grupo · 6 técnicos', lastMsg: 'Cambio de ruta por lluvia', time: 'ayer', unread: 3, online: false },
]

const initMessages = [
  { id: '1', senderName: 'María Rodríguez', text: 'Buenos días Carlos, ¿cómo van los técnicos de El Pozón?', time: '10:35', mine: false },
  { id: '2', senderName: 'Yo', text: 'Buenos días Coordinadora. Ana ya completó el sector B, 38 formularios. Jorge va bien en el sector A.', time: '10:37', mine: true },
  { id: '3', senderName: 'María Rodríguez', text: 'Excelente. ¿Tienen pendientes para validar?', time: '10:40', mine: false },
]

export default function AssistChatPage() {
  const { user } = useAuthStore()
  const [active, setActive] = useState(convs[0])
  const [messages, setMessages] = useState(initMessages)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      senderName: user?.fullName || 'Yo',
      text: input.trim(),
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      mine: true,
    }])
    setInput('')
  }

  return (
    <PageWrapper>
      <TopBar title="Chat" subtitle="Comunicación con coordinadora y técnicos" />
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-72 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convs.map(conv => (
              <button key={conv.id} onClick={() => setActive(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border/50 ${active.id === conv.id ? 'bg-muted/70' : ''}`}>
                <div className="relative flex-shrink-0">
                  <Avatar name={conv.name} size="sm" />
                  {conv.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold truncate">{conv.name}</span>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{conv.lastMsg}</div>
                </div>
                {conv.unread > 0 && <span className="w-5 h-5 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{conv.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
            <div className="relative">
              <Avatar name={active.name} size="sm" />
              {active.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
            </div>
            <div>
              <div className="font-semibold text-sm">{active.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {active.online && <Circle size={8} className="text-green-500 fill-green-500" />}
                {active.online ? 'En línea' : 'Offline'} · {active.role}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/20">
            <AnimatePresence>
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.mine ? 'flex-row-reverse' : ''}`}>
                  {!msg.mine && <Avatar name={msg.senderName} size="sm" />}
                  <div className={`max-w-[65%] flex flex-col ${msg.mine ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.mine ? 'bg-brand-primary text-white rounded-tr-sm' : 'bg-white border border-border text-foreground rounded-tl-sm shadow-sm'}`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          <div className="px-5 py-4 bg-card border-t border-border flex items-center gap-3">
            <button className="p-2 hover:bg-muted rounded-xl transition-colors"><Paperclip size={18} className="text-muted-foreground" /></button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            <button onClick={send} className="w-10 h-10 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl flex items-center justify-center transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
