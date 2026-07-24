import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { getSesiones, tomarSesion, responderSesion, devolverBot, cerrarConversacion } from '../services/sesiones'
import ModalConfirmar from '../components/ModalConfirmar'
import { formatearFecha, formatearHora, formatearSeparadorFecha } from '../utils/fecha'
import { Button } from '@/components/ui/button'

const modoConfig = {
    bot: { label: 'Bot', cls: 'text-green-800 bg-green-100 dark:bg-green-500/15 dark:text-green-400' },
    esperando_agente: { label: 'Esperando', cls: 'text-amber-800 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400' },
    humano: { label: 'Con agente', cls: 'text-blue-700 bg-blue-100 dark:bg-blue-500/15 dark:text-blue-400' },
}

function Chat() {
    const [sesiones, setSesiones] = useState([])
    const [sesionActiva, setSesionActiva] = useState(null)
    const [mensaje, setMensaje] = useState('')
    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [mensajes, setMensajes] = useState([])
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [buscar, setBuscar] = useState('')
    const [sinLeer, setSinLeer] = useState(new Set())
    const inputRef = useRef(null)
    const mensajesRef = useRef(null)
    const prevSesionesRef = useRef(null)
    const [searchParams] = useSearchParams()
    const numeroParam = searchParams.get('numero')

    useEffect(() => {
        cargarSesiones()
        const intervalo = setInterval(cargarSesiones, 5000)
        return () => clearInterval(intervalo)
    }, [])

    useEffect(() => {
        if (numeroParam && sesiones.length > 0) {
            const target = sesiones.find(s => s.cliente_numero === numeroParam)
            if (target && target.cliente_numero !== sesionActiva?.cliente_numero) {
                marcarLeido(target.cliente_numero, target)
                return
            }
        }
        if (sesionActiva) {
            const actualizada = sesiones.find(s => s.cliente_numero === sesionActiva.cliente_numero)
            if (actualizada) setSesionActiva(actualizada)
        }
    }, [sesiones, numeroParam])

    useEffect(() => {
        if (!sesionActiva) return
        cargarMensajes(sesionActiva.cliente_numero, true)
        const intervalo = setInterval(() => cargarMensajes(sesionActiva.cliente_numero), 3000)
        return () => clearInterval(intervalo)
    }, [sesionActiva?.cliente_numero])

    async function cargarSesiones() {
        try {
            const datos = await getSesiones()
            setSesionesConNotificaciones(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar las conversaciones.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally {
            setCargando(false)
        }
    }

    function setSesionesConNotificaciones(datos) {
        const prev = prevSesionesRef.current
        if (prev !== null) {
            const nuevosNumeros = []
            for (const sesion of datos) {
                const anterior = prev.get(sesion.cliente_numero)
                if (!anterior) {
                    nuevosNumeros.push(sesion.cliente_numero)
                } else if (anterior.modo !== 'esperando_agente' && sesion.modo === 'esperando_agente') {
                    nuevosNumeros.push(sesion.cliente_numero)
                }
            }
            if (nuevosNumeros.length > 0) {
                setSinLeer(prev => new Set([...prev, ...nuevosNumeros]))
            }
        }
        prevSesionesRef.current = new Map(datos.map(s => [s.cliente_numero, s]))
        setSesiones(datos)
        const numerosActivos = new Set(datos.map(s => s.cliente_numero))
        setSinLeer(prev => {
            const pruned = new Set([...prev].filter(n => numerosActivos.has(n)))
            return pruned.size === prev.size ? prev : pruned
        })
    }

    function marcarLeido(numero, sesion) {
        setSinLeer(prev => { const n = new Set(prev); n.delete(numero); return n })
        setSesionActiva(sesion)
    }

    async function cargarMensajes(numero, inicial = false) {
        try {
            const res = await api.get(`/sesiones/${numero}/mensajes`)
            setMensajes(res.data)

            if (mensajesRef.current) {
                const el = mensajesRef.current
                const estaAlFondo = el.scrollHeight - el.scrollTop - el.clientHeight < 80
                if (inicial || estaAlFondo) {
                    setTimeout(() => {
                        el.scrollTo({ top: el.scrollHeight, behavior: inicial ? 'instant' : 'smooth' })
                    }, 50)
                }
            }
        } catch (err) {}
    }

    async function handleTomarControl(numero) {
        try {
            await tomarSesion(numero, 1)
            await cargarSesiones()
            await cargarMensajes(numero)
            inputRef.current?.focus()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo tomar el control.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleDevolverBot(numero) {
        try {
            await devolverBot(numero)
            await cargarSesiones()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo devolver el control al bot.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleCerrarConversacion(numero) {
        setModalConfirmar({
            titulo: 'Cerrar conversación',
            mensaje: `¿Cerrar la conversación con ${numero}? El cliente podrá volver a escribir desde cero.`,
            textoBoton: 'Cerrar conversación',
            colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await cerrarConversacion(numero)
                    setModalConfirmar(null)
                    setSesionActiva(null)
                    await cargarSesiones()
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo cerrar la conversación.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    async function handleEnviar() {
        if (!mensaje.trim() || !sesionActiva) return
        try {
            setEnviando(true)
            await responderSesion(sesionActiva.cliente_numero, mensaje)
            setMensaje('')
            await cargarMensajes(sesionActiva.cliente_numero)
            inputRef.current?.focus()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo enviar el mensaje.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setEnviando(false) }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
    }

    // Pasos del bot
    const pasosOrden = ['inicio', 'buscando_producto', 'eligiendo_producto', 'eligiendo_presentacion', 'confirmando', 'factura', 'eligiendo_envio', 'datos_delivery', 'venta_registrada']
    function indexPaso(paso) { return pasosOrden.findIndex(p => paso?.includes(p.replace('_', ''))) }

    const sesionesFiltradas = sesiones.filter(s =>
        s.cliente_numero.includes(buscar) || s.paso?.toLowerCase().includes(buscar.toLowerCase())
    )

    if (cargando) return (
        <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-[#0b141a] dark:text-slate-400">
            Cargando conversaciones...
        </div>
    )

    return (
        <div className="chat-wrap flex h-[calc(100vh-56px)] overflow-hidden">

            {/* Lista conversaciones */}
            <aside className={`chat-sessions${sesionActiva ? ' has-active' : ''} flex w-[340px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800`}>
                {/* Buscador */}
                <div className="border-b border-slate-200 p-3.5 dark:border-slate-700">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 flex -translate-y-1/2 text-slate-400 dark:text-slate-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                        <input
                            placeholder="Buscar conversaciones..."
                            value={buscar}
                            onChange={e => setBuscar(e.target.value)}
                            className="w-full rounded-xl border-none bg-slate-100 py-2.5 pl-9 pr-3 text-[13px] text-slate-900 outline-none dark:bg-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-3">
                        <div className="mb-2.5 flex items-center justify-between pl-2 pr-1">
                            <p className="m-0 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Conversaciones activas ({sesionesFiltradas.length})
                            </p>
                            {sinLeer.size > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-extrabold leading-tight text-white">
                                    {sinLeer.size} sin leer
                                </span>
                            )}
                        </div>

                        {sesionesFiltradas.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                <span className="mb-2 flex justify-center opacity-40"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
                                <p className="text-[13px]">No hay conversaciones activas.</p>
                            </div>
                        ) : (
                            sesionesFiltradas.map(sesion => {
                                const activa = sesionActiva?.cliente_numero === sesion.cliente_numero
                                const esSinLeer = sinLeer.has(sesion.cliente_numero)
                                const cfg = modoConfig[sesion.modo] || modoConfig.bot
                                return (
                                    <div key={sesion.cliente_numero} onClick={() => marcarLeido(sesion.cliente_numero, sesion)}
                                        className={`mb-1 cursor-pointer rounded-2xl border p-3.5 transition-colors ${
                                            activa ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/15'
                                            : esSinLeer ? 'border-red-200 bg-red-50/70 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40'
                                        }`}
                                    >
                                        <div className="mb-1.5 flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="relative shrink-0">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                                        {sesion.cliente_numero.slice(-2)}
                                                    </div>
                                                    {esSinLeer && (
                                                        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 dark:border-slate-800" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`text-[13px] ${esSinLeer ? 'font-extrabold text-red-600 dark:text-red-400' : 'font-bold text-slate-900 dark:text-slate-100'}`}>{sesion.cliente_numero}</p>
                                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Paso: {sesion.paso}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">{formatearFecha(sesion.ultimo_mensaje)}</p>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </aside>

            {/* Panel chat */}
            <section className={`chat-messages${sesionActiva ? ' has-active' : ''} flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-[#0b141a]`}>
                {!sesionActiva ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                        <span className="opacity-30"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
                        <p className="text-[15px] font-medium">Seleccioná una conversación</p>
                        <p className="text-[13px] text-slate-400 dark:text-slate-500">para ver los mensajes y gestionar la atención</p>
                    </div>
                ) : (
                    <>
                        {/* Header chat */}
                        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                                <button className="chat-back-btn hidden items-center p-1 text-slate-500 dark:text-slate-400" onClick={() => setSesionActiva(null)} title="Volver a chats">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                </button>
                                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-slate-200 text-[15px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                    {sesionActiva.cliente_numero.slice(-2)}
                                </div>
                                <div>
                                    <p className="text-[15px] font-bold leading-none text-slate-900 dark:text-slate-100">{sesionActiva.cliente_numero}</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Estado: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sesionActiva.paso}</span> · Modo: <span className="italic">{modoConfig[sesionActiva.modo]?.label || sesionActiva.modo}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {sesionActiva.modo !== 'humano' ? (
                                    <Button onClick={() => handleTomarControl(sesionActiva.cliente_numero)} size="sm">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Tomar control
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => handleDevolverBot(sesionActiva.cliente_numero)} size="sm">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg> Devolver al bot
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => handleCerrarConversacion(sesionActiva.cliente_numero)} size="sm" className="border-red-300 text-red-500 hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10">
                                    Cerrar conversación
                                </Button>
                            </div>
                        </div>

                        {/* Mensajes */}
                        <div ref={mensajesRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
                            {mensajes.length === 0 ? (
                                <p className="mt-10 text-center text-[13px] text-slate-500 dark:text-slate-400">No hay mensajes aún.</p>
                            ) : (
                                mensajes.map((msg, idx) => {
                                    const esCliente = msg.origen === 'cliente'
                                    const esBot = msg.origen === 'bot'
                                    const esAgente = msg.origen === 'agente'
                                    const mostrarSeparador = idx === 0 || formatearSeparadorFecha(msg.created_at) !== formatearSeparadorFecha(mensajes[idx - 1].created_at)
                                    return (
                                        <div key={msg.id} className="flex flex-col gap-3">
                                        {mostrarSeparador && (
                                            <div className="flex justify-center">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                    {formatearSeparadorFecha(msg.created_at)}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex max-w-[80%] flex-col ${esCliente ? 'items-start self-start' : 'items-end self-end'}`}>
                                            <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                                                esCliente ? 'rounded-2xl rounded-bl-[4px] border border-slate-100 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                                                : esBot ? 'rounded-2xl rounded-br-[4px] border border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/25 dark:text-indigo-300'
                                                : 'rounded-2xl rounded-br-[4px] bg-slate-900 text-white'
                                            }`}>
                                                {(() => {
                                                    const texto = msg.texto || ''
                                                    const imgMatch = texto.match(/^\[imagen:\s*(.+)\]$/)
                                                    const audioMatch = texto.match(/^\[audio:\s*(.+)\]$/)

                                                    if (imgMatch) {
                                                        const mediaId = imgMatch[1].trim()
                                                        // URL Supabase o http → directo; /uploads/ → directo; mediaId crudo → proxy
                                                        const imgSrc = mediaId.startsWith('http') || mediaId.startsWith('/uploads/')
                                                            ? mediaId
                                                            : `/api/media/${mediaId}`
                                                        return (
                                                            <div>
                                                                <img
                                                                    src={imgSrc}
                                                                    alt="imagen del cliente"
                                                                    className="block max-h-[280px] max-w-[240px] cursor-pointer rounded-[10px]"
                                                                    onClick={() => window.open(imgSrc, '_blank')}
                                                                    onError={e => {
                                                                        e.target.style.display = 'none'
                                                                        e.target.nextSibling.style.display = 'flex'
                                                                    }}
                                                                />
                                                                <div className="hidden items-center gap-2 rounded-lg bg-slate-100 p-2 dark:bg-slate-900">
                                                                    <span className="flex text-slate-500 dark:text-slate-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">Imagen (no disponible)</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    }

                                                    if (audioMatch) {
                                                        const mediaId = audioMatch[1].trim()
                                                        const audioSrc = mediaId.startsWith('http') || mediaId.startsWith('/uploads/')
                                                            ? mediaId
                                                            : `/api/media/${mediaId}`
                                                        const audioType = audioSrc.endsWith('.mp3') ? 'audio/mpeg'
                                                            : audioSrc.endsWith('.mp4') || audioSrc.endsWith('.m4a') ? 'audio/mp4'
                                                            : audioSrc.endsWith('.aac') ? 'audio/aac'
                                                            : 'audio/ogg; codecs=opus'
                                                        return (
                                                            <div className="min-w-[220px]">
                                                                <audio controls className="h-9 w-full">
                                                                    <source src={audioSrc} type={audioType} />
                                                                </audio>
                                                                <div className="mt-1 flex items-center justify-between">
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Nota de voz</span>
                                                                    <a href={audioSrc} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-indigo-500 no-underline">
                                                                        Abrir
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )
                                                    }

                                                    if (texto === '[audio]') {
                                                        return (
                                                            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-slate-900">
                                                                <span className="flex text-slate-500 dark:text-slate-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></span>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">Nota de voz (sin ID)</span>
                                                            </div>
                                                        )
                                                    }

                                                    return <p className="whitespace-pre-wrap">{texto}</p>
                                                })()}
                                                <div className="mt-1 flex items-center justify-end gap-1">
                                                    <span className="text-[10px] opacity-50">{formatearHora(msg.created_at)}</span>
                                                    {!esCliente && <span className="text-[10px] opacity-60">✓✓</span>}
                                                </div>
                                            </div>
                                            <span className="mt-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                {msg.origen}
                                            </span>
                                        </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Barra de contexto/stepper */}
                        <div className="border-t border-amber-200 bg-amber-50 px-5 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto">
                                    {['inicio', 'eligiendo', 'confirmando', 'envio', 'completado'].map((paso, i) => {
                                        const pasoActual = sesionActiva.paso || ''
                                        const completado = i < 2
                                        const activo = pasoActual.includes(paso) || (i === 1 && pasoActual.includes('presentac'))
                                        return (
                                            <div key={paso} className="flex items-center gap-1.5">
                                                <div className={`flex items-center gap-1.5 rounded-full border ${activo ? 'border-indigo-300 bg-indigo-100 px-2.5 py-1 dark:border-indigo-500/30 dark:bg-indigo-500/20' : 'border-transparent px-2 py-1'}`}>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${activo ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {activo ? '●' : completado ? '✓'  : '○'} {paso}
                                                    </span>
                                                </div>
                                                {i < 4 && <div className="h-px w-3 shrink-0 bg-slate-200 dark:bg-slate-700" />}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-black/5 px-2.5 py-1 dark:border-slate-700 dark:bg-white/5">
                                    <span className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                        {JSON.stringify(sesionActiva.datos)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Input */}
                        <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                            {sesionActiva.modo === 'humano' ? (
                                <div className="flex items-end gap-2.5">
                                    <textarea
                                        ref={inputRef}
                                        value={mensaje}
                                        onChange={e => setMensaje(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribí tu mensaje... (Enter para enviar)"
                                        rows={3}
                                        className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-sans text-[13px] text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    />
                                    <Button onClick={handleEnviar} disabled={enviando || !mensaje.trim()} className="shrink-0 py-6">
                                        {enviando ? '...' : '↑ Enviar'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 py-2 text-[13px] text-slate-500 dark:text-slate-400">
                                    <span className="flex text-slate-400 dark:text-slate-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg></span>
                                    <span>El bot está manejando esta conversación. Hacé clic en <strong className="cursor-pointer text-indigo-600 dark:text-indigo-400" onClick={() => handleTomarControl(sesionActiva.cliente_numero)}>Tomar control</strong> para intervenir.</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            {modalConfirmar && (
                <ModalConfirmar
                    titulo={modalConfirmar.titulo}
                    mensaje={modalConfirmar.mensaje}
                    textoBoton={modalConfirmar.textoBoton}
                    colorBoton={modalConfirmar.colorBoton}
                    onConfirmar={modalConfirmar.onConfirmar}
                    onCancelar={() => setModalConfirmar(null)}
                />
            )}
        </div>
    )
}

export default Chat
