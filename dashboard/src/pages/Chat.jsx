import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { getSesiones, tomarSesion, responderSesion, devolverBot, cerrarConversacion } from '../services/sesiones'
import ModalConfirmar from '../components/ModalConfirmar'

function Chat() {
    const [sesiones, setSesiones] = useState([])
    const [sesionActiva, setSesionActiva] = useState(null)
    const [mensaje, setMensaje] = useState('')
    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [mensajes, setMensajes] = useState([])
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const inputRef = useRef(null)
    const mensajesRef = useRef(null)

    useEffect(() => {
        cargarSesiones()
        const intervalo = setInterval(cargarSesiones, 5000)
        return () => clearInterval(intervalo)
    }, [])

    useEffect(() => {
        if (sesionActiva) {
            const actualizada = sesiones.find(s => s.cliente_numero === sesionActiva.cliente_numero)
            if (actualizada) setSesionActiva(actualizada)
        }
    }, [sesiones])

    useEffect(() => {
        if (!sesionActiva) return
        cargarMensajes(sesionActiva.cliente_numero)
        const intervalo = setInterval(() => {
            cargarMensajes(sesionActiva.cliente_numero)
        }, 3000)
        return () => clearInterval(intervalo)
    }, [sesionActiva?.cliente_numero])

    async function cargarSesiones() {
        try {
            const datos = await getSesiones()
            setSesiones(datos)
            setCargando(false)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar las conversaciones.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function cargarMensajes(numero) {
        try {
            const res = await api.get(`/sesiones/${numero}/mensajes`)
            setMensajes(res.data)
            setTimeout(() => {
                mensajesRef.current?.scrollTo({ top: mensajesRef.current.scrollHeight, behavior: 'smooth' })
            }, 100)
        } catch (err) {
            // silencioso — no interrumpir el polling
        }
    }

    async function handleTomarControl(numero) {
        try {
            await tomarSesion(numero, 1)
            await cargarSesiones()
            await cargarMensajes(numero)
            inputRef.current?.focus()
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo tomar el control de la conversación.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function handleDevolverBot(numero) {
        try {
            await devolverBot(numero)
            await cargarSesiones()
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo devolver el control al bot.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
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
                    setModalConfirmar({
                        titulo: 'Error',
                        mensaje: 'No se pudo cerrar la conversación.',
                        textoBoton: 'Cerrar',
                        colorBoton: '#888',
                        onConfirmar: () => setModalConfirmar(null)
                    })
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
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo enviar el mensaje.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setEnviando(false)
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleEnviar()
        }
    }

    function colorModo(modo) {
        const colores = {
            bot: '#10b981',
            esperando_agente: '#f59e0b',
            humano: '#3b82f6'
        }
        return colores[modo] || '#888'
    }

    function labelModo(modo) {
        const labels = {
            bot: 'Bot',
            esperando_agente: 'Esperando agente',
            humano: 'Con agente'
        }
        return labels[modo] || modo
    }

    function formatearFecha(fecha) {
        return new Date(fecha).toLocaleString('es-PY', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando conversaciones...</p></div>

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

            {/* Lista de conversaciones */}
            <div style={{ width: '320px', borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: 'white' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Conversaciones</h3>
                    <span style={{ fontSize: '12px', color: '#888' }}>{sesiones.length}</span>
                </div>

                {sesiones.length === 0 ? (
                    <p style={{ padding: '16px', color: '#888', fontSize: '13px' }}>No hay conversaciones activas.</p>
                ) : (
                    sesiones.map(sesion => (
                        <div
                            key={sesion.cliente_numero}
                            onClick={() => setSesionActiva(sesion)}
                            style={{
                                padding: '14px 16px',
                                borderBottom: '1px solid #f0f0f0',
                                cursor: 'pointer',
                                background: sesionActiva?.cliente_numero === sesion.cliente_numero ? '#f0f4ff' : 'white'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600' }}>{sesion.cliente_numero}</span>
                                <span style={{ fontSize: '11px', color: '#888' }}>{formatearFecha(sesion.ultimo_mensaje)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#888' }}>Paso: {sesion.paso}</span>
                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '500', color: 'white', backgroundColor: colorModo(sesion.modo) }}>
                                    {labelModo(sesion.modo)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Panel derecho */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
                {!sesionActiva ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        <p>Seleccioná una conversación para ver los detalles</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontWeight: '600', fontSize: '15px' }}>{sesionActiva.cliente_numero}</p>
                                <p style={{ fontSize: '12px', color: '#888' }}>Paso: {sesionActiva.paso} · Modo: {labelModo(sesionActiva.modo)}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {sesionActiva.modo !== 'humano' ? (
                                    <button
                                        onClick={() => handleTomarControl(sesionActiva.cliente_numero)}
                                        style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        Tomar control
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleDevolverBot(sesionActiva.cliente_numero)}
                                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        Devolver al bot
                                    </button>
                                )}
                                <button
                                    onClick={() => handleCerrarConversacion(sesionActiva.cliente_numero)}
                                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}
                                >
                                    Cerrar conversación
                                </button>
                            </div>
                        </div>

                        {/* Historial de mensajes */}
                        <div
                            ref={mensajesRef}
                            style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                        >
                            {mensajes.length === 0 ? (
                                <p style={{ color: '#888', fontSize: '13px', textAlign: 'center' }}>No hay mensajes aún.</p>
                            ) : (
                                mensajes.map(msg => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: msg.origen === 'cliente' ? 'flex-start' : 'flex-end'
                                        }}
                                    >
                                        <div style={{
                                            maxWidth: '70%',
                                            padding: '8px 12px',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            background: msg.origen === 'cliente' ? 'white' : msg.origen === 'bot' ? '#e0e7ff' : '#1a1a2e',
                                            color: msg.origen === 'agente' ? 'white' : '#333',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}>
                                            <p style={{ marginBottom: '4px' }}>{msg.texto}</p>
                                            <p style={{ fontSize: '10px', opacity: 0.6, textAlign: 'right' }}>
                                                {msg.origen} · {new Date(msg.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Contexto */}
                        <div style={{ padding: '8px 20px', background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
                            <p style={{ fontSize: '11px', color: '#92400e' }}>
                                Paso: {sesionActiva.paso} · {JSON.stringify(sesionActiva.datos)}
                            </p>
                        </div>

                        {/* Área de respuesta */}
                        <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
                            {sesionActiva.modo === 'humano' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <textarea
                                        ref={inputRef}
                                        value={mensaje}
                                        onChange={e => setMensaje(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribí tu mensaje... (Enter para enviar)"
                                        rows={3}
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', resize: 'none', fontFamily: 'sans-serif' }}
                                    />
                                    <button
                                        onClick={handleEnviar}
                                        disabled={enviando || !mensaje.trim()}
                                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: enviando ? '#ccc' : '#1a1a2e', color: 'white', fontSize: '13px', cursor: enviando ? 'not-allowed' : 'pointer', alignSelf: 'flex-end' }}
                                    >
                                        {enviando ? 'Enviando...' : 'Enviar'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ padding: '12px 16px', background: '#f0f4ff', borderRadius: '8px', fontSize: '13px', color: '#3730a3', textAlign: 'center' }}>
                                    El bot está manejando esta conversación. Hacé clic en <strong>Tomar control</strong> para intervenir.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

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