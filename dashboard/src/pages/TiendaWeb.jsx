import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { formatMiles } from '../utils/formato'
import { formatearSoloFecha } from '../utils/fecha'
import ModalConfirmar from '../components/ModalConfirmar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none box-border focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-100/10'
const labelCls = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

const IconMas = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
const IconBasura = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
const IconLapiz = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
const IconImagen = ({ size = 28 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
const IconMascota = () => <svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="50" cy="65" rx="24" ry="20" /><circle cx="22" cy="38" r="11" /><circle cx="42" cy="26" r="11" /><circle cx="62" cy="26" r="11" /><circle cx="78" cy="38" r="11" /></svg>

// ─── Upload de imagen ─────────────────────────────────────────
function InputImagen({ value, onChange }) {
    const inputRef = useRef(null)
    const [subiendo, setSubiendo] = useState(false)
    const [errorImg, setErrorImg] = useState('')

    async function handleArchivo(e) {
        const file = e.target.files[0]
        if (!file) return
        setErrorImg('')
        setSubiendo(true)
        try {
            const fd = new FormData()
            fd.append('imagen', file)
            const { data } = await api.post('/uploads/imagen', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            onChange(data.url)
        } catch (err) {
            setErrorImg(err.response?.data?.error || 'Error al subir la imagen.')
        } finally {
            setSubiendo(false)
        }
    }

    return (
        <div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="URL de imagen o subí un archivo..."
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={`${inputCls} flex-1`}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={subiendo}
                    className="flex-shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                    {subiendo ? 'Subiendo...' : 'Subir archivo'}
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleArchivo}
                />
            </div>
            {errorImg && <p className="mt-1 text-xs text-red-500">{errorImg}</p>}
            {value && (
                <img
                    src={value}
                    alt=""
                    className="mt-2 block h-20 w-20 rounded-lg object-cover"
                    onError={e => { e.target.style.display = 'none' }}
                />
            )}
        </div>
    )
}

// ─── Helpers ─────────────────────────────────────────────────
function Modal({ children, onClose, title, width = 520 }) {
    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl dark:bg-slate-800 dark:text-slate-100"
                style={{ maxWidth: width }}
            >
                {title && (
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="m-0 text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                        <button onClick={onClose} className="cursor-pointer border-none bg-transparent text-xl leading-none text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">×</button>
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}

// ─── Selector de subcategoria dinamico ───────────────────────
const SUBCATS_CACHE = {}

function SubcatSelect({ categoriaSlug, value, onChange }) {
    const [opciones, setOpciones] = useState([])
    const [cargando, setCargando] = useState(false)

    useEffect(() => {
        if (!categoriaSlug) { setOpciones([]); return }
        if (SUBCATS_CACHE[categoriaSlug]) { setOpciones(SUBCATS_CACHE[categoriaSlug]); return }
        setCargando(true)
        api.get(`/ecommerce/subcategorias`, { params: { categoria: categoriaSlug } })
            .then(({ data }) => { SUBCATS_CACHE[categoriaSlug] = data; setOpciones(data) })
            .catch(() => setOpciones([]))
            .finally(() => setCargando(false))
    }, [categoriaSlug])

    return (
        <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            disabled={!categoriaSlug || cargando}
            className={inputCls}
            style={{ opacity: (!categoriaSlug || cargando) ? 0.5 : 1 }}
        >
            <option value="">{cargando ? 'Cargando...' : '-- Todas --'}</option>
            {opciones.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.nombre}</option>
            ))}
        </select>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — PRODUCTOS
// ════════════════════════════════════════════════════════════════
function TabProductos() {
    const [productos, setProductos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [buscar, setBuscar] = useState('')
    const [filtrocat, setFiltrocat] = useState('') // '' = todas, 'sin' = sin categoria
    const [editando, setEditando] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')
    const [confirmarEliminar, setConfirmarEliminar] = useState(null)
    const [editandoImagenPres, setEditandoImagenPres] = useState(null)
    const [imagenPresValue, setImagenPresValue] = useState('')
    const [guardandoImagenId, setGuardandoImagenId] = useState(null)
    const [errorImagenPres, setErrorImagenPres] = useState('')
    const [imagenesRotas, setImagenesRotas] = useState(() => new Set())

    // Guarda la imagen de UNA presentación puntual; aislado del resto (id capturado al iniciar
    // el guardado) para que abrir/cerrar el modal de otra presentación mientras esto sigue en
    // vuelo no cierre ni pise el modal equivocado.
    async function guardarImagenPres() {
        const id = editandoImagenPres.presentacion_id
        const valor = imagenPresValue || null
        setGuardandoImagenId(id)
        setErrorImagenPres('')
        try {
            await api.patch(`/ecommerce/admin/productos/${id}`, { imagen_presentacion_url: valor })
            setProductos(p => p.map(x => x.presentacion_id === id ? { ...x, imagen_presentacion_url: valor } : x))
            setImagenesRotas(prev => { const next = new Set(prev); next.delete(id); return next })
            setEditandoImagenPres(prev => (prev && prev.presentacion_id === id) ? null : prev)
        } catch {
            setErrorImagenPres('Error al guardar la imagen de la presentación.')
        } finally {
            setGuardandoImagenId(prev => prev === id ? null : prev)
        }
    }

    function nombreWeb(prod) {
        return prod.producto_nombre
    }

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const { data } = await api.get('/ecommerce/admin/productos', { params: { buscar } })
            setProductos(data)
        } catch {
            setError('No se pudieron cargar los productos.')
        } finally {
            setCargando(false)
        }
    }, [buscar])

    useEffect(() => { cargar() }, [cargar])

    const CAMPOS_PRODUCTO = ['es_novedad', 'es_destacado', 'imagen_url', 'ecommerce_categoria', 'ecommerce_subcategoria_id', 'atributos']

    async function toggleCampo(prod, campo, valor) {
        const prev = [...productos]
        const esNivelProducto = CAMPOS_PRODUCTO.includes(campo)
        setProductos(p => p.map(x => {
            if (esNivelProducto && x.producto_id === prod.producto_id) return { ...x, [campo]: valor }
            if (!esNivelProducto && x.presentacion_id === prod.presentacion_id) return { ...x, [campo]: valor }
            return x
        }))
        try {
            await api.patch(`/ecommerce/admin/productos/${prod.presentacion_id}`, { [campo]: valor })
        } catch {
            setProductos(prev)
            setError('Error al actualizar.')
        }
    }

    const [filtrosConfig, setFiltrosConfig] = useState([])

    function abrirEditar(prod) {
        setEditando(prod)
        setEditForm({
            imagen_url: prod.imagen_url || '',
            es_novedad: prod.es_novedad,
            es_destacado: prod.es_destacado,
            disponible: prod.disponible,
            ecommerce_categoria: prod.ecommerce_categoria || '',
            ecommerce_subcategoria_id: prod.ecommerce_subcategoria_id || '',
            atributos: prod.atributos || {},
            especie: prod.especie || '',
        })
        // Cargar filtros config para la categoria de este producto
        const cat = prod.ecommerce_categoria || ''
        if (cat) {
            api.get('/ecommerce/admin/filtros-config')
                .then(({ data }) => setFiltrosConfig(data.filter(f => !f.categorias || f.categorias.includes(cat))))
                .catch(() => setFiltrosConfig([]))
        } else {
            setFiltrosConfig([])
        }
    }

    async function handleEliminarProducto(prod) {
        setConfirmarEliminar({
            titulo: 'Eliminar presentacion',
            mensaje: `¿Eliminar "${prod.producto_nombre} — ${prod.presentacion_nombre}" del inventario? Esta accion no se puede deshacer y fallara si el producto tiene ventas registradas.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await api.delete(`/productos/presentaciones/${prod.presentacion_id}`)
                    setConfirmarEliminar(null)
                    await cargar()
                } catch (err) {
                    setConfirmarEliminar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo eliminar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setConfirmarEliminar(null) })
                }
            }
        })
    }

    async function guardarEditar() {
        setGuardando(true)
        try {
            await api.patch(`/ecommerce/admin/productos/${editando.presentacion_id}`, { ...editForm, especie: editForm.especie || null })
            // Campos del producto se propagan a todas las presentaciones del mismo producto
            const camposProducto = {
                imagen_url: editForm.imagen_url,
                es_novedad: editForm.es_novedad,
                es_destacado: editForm.es_destacado,
                ecommerce_categoria: editForm.ecommerce_categoria,
                ecommerce_subcategoria_id: editForm.ecommerce_subcategoria_id || null,
                atributos: editForm.atributos || {},
                especie: editForm.especie || null,
            }
            setProductos(p => p.map(x => {
                if (x.producto_id === editando.producto_id) {
                    // disponible es por presentacion, solo actualizar la editada
                    const extra = x.presentacion_id === editando.presentacion_id ? { disponible: editForm.disponible } : {}
                    return { ...x, ...camposProducto, ...extra }
                }
                return x
            }))
            setEditando(null)
        } catch {
            setError('Error al guardar los cambios.')
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div>
            {/* Buscador + filtro categoria */}
            <div className="mb-4 flex flex-wrap gap-2.5">
                <input
                    placeholder="Buscar producto o presentación..."
                    value={buscar}
                    onChange={e => setBuscar(e.target.value)}
                    className={`${inputCls} flex-[1_1_200px]`}
                />
                <select
                    value={filtrocat}
                    onChange={e => setFiltrocat(e.target.value)}
                    className={`${inputCls} flex-[0_0_180px]`}
                >
                    <option value="">Todas las categorias</option>
                    <option value="sin">Sin categoria web</option>
                    <option value="perros">Perros</option>
                    <option value="gatos">Gatos</option>
                    <option value="medicamentos">Medicamentos</option>
                    <option value="accesorios">Accesorios</option>
                    <option value="cuidado">Cuidado</option>
                    <option value="ofertas">Ofertas (descuento activo)</option>
                </select>
            </div>

            {error && <p className="mb-3 text-[13px] text-red-500">{error}</p>}

            {cargando ? (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando productos...</p>
            ) : (() => {
                const CAT_COLORS = {
                    perros: '#ffa601', gatos: '#7c3aed', medicamentos: '#0ea5e9',
                    accesorios: '#f97316', cuidado: '#10b981', ofertas: '#dc2626',
                }
                const filtered = productos.filter(prod => {
                    if (!filtrocat) return true
                    if (filtrocat === 'sin') return !prod.ecommerce_categoria
                    if (filtrocat === 'ofertas') return !!prod.en_oferta
                    return prod.ecommerce_categoria === filtrocat
                })
                if (filtered.length === 0) return <p className="text-[13px] text-slate-500 dark:text-slate-400">No hay productos con este filtro.</p>
                return (
                    <div>
                        <p className="mb-2.5 text-xs text-slate-500 dark:text-slate-400">{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Imagen</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Producto</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Presentación</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Cat. Web</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Precio</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Stock</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Disp.</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Nov.</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">Dest.</th>
                                        <th className="whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // Agrupar por producto
                                        const grupos = []
                                        const idx = {}
                                        filtered.forEach(p => {
                                            if (idx[p.producto_id] === undefined) {
                                                idx[p.producto_id] = grupos.length
                                                grupos.push([p])
                                            } else {
                                                grupos[idx[p.producto_id]].push(p)
                                            }
                                        })
                                        return grupos.map(grupo => grupo.map((prod, pi) => {
                                        const catColor = CAT_COLORS[prod.ecommerce_categoria] || null
                                        const esFirst = pi === 0
                                        return (
                                            <tr key={prod.presentacion_id} className={`bg-white dark:bg-slate-800 ${esFirst ? 'border-t-2 border-slate-200 dark:border-slate-700' : ''}`}>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle text-[13px] dark:border-slate-700">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setErrorImagenPres(''); setEditandoImagenPres(prod); setImagenPresValue(prod.imagen_presentacion_url || '') }}
                                                        title="Imagen de esta presentación"
                                                        className="flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-slate-50 p-0 dark:bg-slate-900"
                                                        style={{ borderColor: prod.imagen_presentacion_url ? '#6366f1' : undefined }}
                                                    >
                                                        {(prod.imagen_presentacion_url || prod.imagen_url) && !imagenesRotas.has(prod.presentacion_id) ? (
                                                            <img
                                                                src={prod.imagen_presentacion_url || prod.imagen_url}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                                onError={() => setImagenesRotas(prev => new Set(prev).add(prod.presentacion_id))}
                                                            />
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-slate-500"><IconMascota /></span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle text-[13px] dark:border-slate-700">
                                                    {esFirst && <span className="font-semibold text-slate-900 dark:text-slate-100">{nombreWeb(prod)}</span>}
                                                    {esFirst && prod.categoria_nombre && <span className="block text-[11px] text-slate-500 dark:text-slate-400">{prod.categoria_nombre}</span>}
                                                </td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400" style={{ paddingLeft: esFirst ? undefined : 24 }}>
                                                    {!esFirst && <span className="mr-1 text-slate-400 dark:text-slate-500">└</span>}
                                                    {prod.presentacion_nombre}
                                                </td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle text-[13px] dark:border-slate-700">
                                                    {prod.ecommerce_categoria ? (
                                                        <span
                                                            className="inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold"
                                                            style={{
                                                                background: catColor ? `${catColor}18` : undefined,
                                                                color: catColor || undefined,
                                                                borderColor: catColor ? `${catColor}35` : undefined,
                                                            }}
                                                        >
                                                            {prod.ecommerce_categoria}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle text-[13px] font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">Gs. {formatMiles(prod.precio_venta)}</td>
                                                <td className={`border-b border-slate-100 px-3.5 py-2.5 align-middle text-[13px] font-semibold dark:border-slate-700 ${prod.stock <= 0 ? 'text-red-500' : prod.stock <= 5 ? 'text-amber-500' : 'text-green-500'}`}>{prod.stock}</td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 text-center align-middle dark:border-slate-700">
                                                    <Switch checked={prod.disponible} onCheckedChange={v => toggleCampo(prod, 'disponible', v)} />
                                                </td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 text-center align-middle dark:border-slate-700">
                                                    {esFirst && <Switch checked={prod.es_novedad} onCheckedChange={v => toggleCampo(prod, 'es_novedad', v)} />}
                                                </td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 text-center align-middle dark:border-slate-700">
                                                    {esFirst && <Switch checked={prod.es_destacado} onCheckedChange={v => toggleCampo(prod, 'es_destacado', v)} />}
                                                </td>
                                                <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle text-[13px] dark:border-slate-700">
                                                    <div className="flex gap-1.5">
                                                        {esFirst && (
                                                            <Button variant="outline" size="sm" onClick={() => abrirEditar(prod)}>
                                                                Editar
                                                            </Button>
                                                        )}
                                                        <Button variant="destructive" size="sm" onClick={() => handleEliminarProducto(prod)}>
                                                            <IconBasura />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                        }))
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            })()}

            {confirmarEliminar && (
                <ModalConfirmar
                    titulo={confirmarEliminar.titulo}
                    mensaje={confirmarEliminar.mensaje}
                    textoBoton={confirmarEliminar.textoBoton}
                    colorBoton={confirmarEliminar.colorBoton}
                    onConfirmar={confirmarEliminar.onConfirmar}
                    onCancelar={() => setConfirmarEliminar(null)}
                />
            )}

            {/* Modal imagen de la presentación (independiente de la imagen general del producto) */}
            {editandoImagenPres && (() => {
                const guardandoEsta = guardandoImagenId === editandoImagenPres.presentacion_id
                return (
                    <Modal onClose={() => setEditandoImagenPres(null)} title={`Imagen — ${editandoImagenPres.presentacion_nombre}`} width={420}>
                        <div className="flex flex-col gap-3.5">
                            {errorImagenPres && <p className="m-0 text-[13px] text-red-500">{errorImagenPres}</p>}
                            <div>
                                <label className={labelCls}>Imagen de esta presentación (opcional)</label>
                                <InputImagen value={imagenPresValue} onChange={setImagenPresValue} />
                                <p className="mt-1 mb-0 text-[11px] text-slate-400 dark:text-slate-500">
                                    Si no se define, se usa la imagen general del producto.
                                </p>
                            </div>
                            <div className="mt-1 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditandoImagenPres(null)}>Cancelar</Button>
                                <Button onClick={guardarImagenPres} disabled={guardandoEsta}>
                                    {guardandoEsta ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )
            })()}

            {/* Modal editar producto */}
            {editando && (
                <Modal onClose={() => setEditando(null)} title={nombreWeb(editando)}>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className={labelCls}>Imagen</label>
                            <InputImagen
                                value={editForm.imagen_url}
                                onChange={url => setEditForm(f => ({ ...f, imagen_url: url }))}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { key: 'disponible', label: 'Disponible en tienda' },
                                { key: 'es_novedad', label: 'Marcar como novedad' },
                                { key: 'es_destacado', label: 'Producto destacado' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                                    <span className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
                                    <Switch checked={editForm[key]} onCheckedChange={v => setEditForm(f => ({ ...f, [key]: v }))} />
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className={labelCls}>Especie</label>
                            <select
                                value={editForm.especie}
                                onChange={e => setEditForm(f => ({ ...f, especie: e.target.value }))}
                                className={inputCls}
                            >
                                <option value="">Sin especificar</option>
                                <option value="perro">Perro</option>
                                <option value="gato">Gato</option>
                                <option value="ambos">Ambos</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Categoria web</label>
                                <select
                                    value={editForm.ecommerce_categoria}
                                    onChange={e => {
                                        const cat = e.target.value
                                        setEditForm(f => ({ ...f, ecommerce_categoria: cat, ecommerce_subcategoria_id: '', atributos: {} }))
                                        if (cat) {
                                            api.get('/ecommerce/admin/filtros-config')
                                                .then(({ data }) => setFiltrosConfig(data.filter(f => !f.categorias || f.categorias.includes(cat))))
                                                .catch(() => setFiltrosConfig([]))
                                        } else { setFiltrosConfig([]) }
                                    }}
                                    className={inputCls}
                                >
                                    <option value="">-- Sin categoria --</option>
                                    <option value="perros">Perros</option>
                                    <option value="gatos">Gatos</option>
                                    <option value="medicamentos">Medicamentos</option>
                                    <option value="accesorios">Accesorios</option>
                                    <option value="cuidado">Cuidado</option>
                                </select>
                                <p className="mt-1 mb-0 text-[11px] text-slate-400 dark:text-slate-500">
                                    "Ofertas" no se asigna acá: aparece solo cuando activás el descuento en Inventario.
                                </p>
                            </div>
                            <div>
                                <label className={labelCls}>Subcategoria web</label>
                                <SubcatSelect
                                    categoriaSlug={editForm.ecommerce_categoria}
                                    value={editForm.ecommerce_subcategoria_id}
                                    onChange={v => setEditForm(f => ({ ...f, ecommerce_subcategoria_id: v }))}
                                />
                            </div>
                        </div>

                        <p className="m-0 mb-1 rounded-md bg-violet-100 px-2.5 py-1.5 text-[11px] text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300">
                            La categoría web y los atributos de filtro se auto-asignan desde la subcategoría del inventario. Editá la subcategoría en Inventario para cambiarlos. Podés sobreescribir manualmente si necesitás.
                        </p>

                        {/* Atributos dinámicos desde ecommerce_filtros_config */}
                        {filtrosConfig.length > 0 && (() => {
                            // Agrupar por campo
                            const grupos = {}
                            filtrosConfig.forEach(f => {
                                if (!grupos[f.campo]) grupos[f.campo] = { label: f.label, valores: [] }
                                grupos[f.campo].valores.push({ valor: f.valor, label_valor: f.label_valor })
                            })
                            const campos = Object.entries(grupos)
                            return (
                                <div className={`grid gap-3 ${campos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {campos.map(([campo, { label, valores }]) => (
                                        <div key={campo}>
                                            <label className={labelCls}>{label}</label>
                                            <select
                                                value={editForm.atributos?.[campo] ?? ''}
                                                onChange={e => setEditForm(f => ({
                                                    ...f,
                                                    atributos: { ...f.atributos, [campo]: e.target.value || undefined }
                                                }))}
                                                className={inputCls}
                                            >
                                                <option value="">-- Sin especificar --</option>
                                                {valores.map(({ valor, label_valor }) => (
                                                    <option key={valor} value={valor}>{label_valor}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}

                        <div className="mt-1 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
                            <Button onClick={guardarEditar} disabled={guardando}>
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — SUBCATEGORÍAS
// ════════════════════════════════════════════════════════════════
const CAT_SLUGS_LABELS = [
    { slug: 'perros',       label: 'Perros' },
    { slug: 'gatos',        label: 'Gatos' },
    { slug: 'medicamentos', label: 'Medicamentos' },
    { slug: 'accesorios',   label: 'Accesorios' },
    { slug: 'cuidado',      label: 'Cuidado' },
]
const SUBCAT_VACIA = { nombre: '', categoria_slug: 'perros', orden: 0, especie: 'ambos' }
const ESPECIE_LABELS = [
    { valor: 'perro', label: 'Perro' },
    { valor: 'gato',  label: 'Gato' },
    { valor: 'ambos', label: 'Ambos' },
]

function TabSubcategorias() {
    const [subcats, setSubcats] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [modal, setModal] = useState(null) // null | 'crear' | objeto
    const [form, setForm] = useState(SUBCAT_VACIA)
    const [guardando, setGuardando] = useState(false)
    const [confirmar, setConfirmar] = useState(null)

    async function cargar() {
        setCargando(true)
        try {
            const { data } = await api.get('/ecommerce/admin/subcategorias')
            setSubcats(data)
        } catch { setError('No se pudieron cargar las subcategorías.') }
        finally { setCargando(false) }
    }
    useEffect(() => { cargar() }, [])

    async function guardar() {
        if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
        setGuardando(true); setError('')
        try {
            if (modal === 'crear') {
                const { data } = await api.post('/ecommerce/admin/subcategorias', form)
                setSubcats(prev => [...prev, data])
            } else {
                const { data } = await api.patch(`/ecommerce/admin/subcategorias/${modal.id}`, form)
                setSubcats(prev => prev.map(x => x.id === modal.id ? data : x))
            }
            setModal(null)
        } catch (err) { setError(err.response?.data?.error || 'Error al guardar.') }
        finally { setGuardando(false) }
    }

    async function eliminar(id) {
        try {
            await api.delete(`/ecommerce/admin/subcategorias/${id}`)
            setSubcats(prev => prev.filter(x => x.id !== id))
            setConfirmar(null)
        } catch { setError('Error al eliminar.') }
    }

    // Agrupar por categoria
    const porCategoria = CAT_SLUGS_LABELS.map(cat => ({
        ...cat,
        items: subcats.filter(s => s.categoria_slug === cat.slug).sort((a, b) => a.orden - b.orden),
    })).filter(cat => cat.items.length > 0 || modal !== null)

    const CAT_COLORS = { perros: '#ffa601', gatos: '#7c3aed', medicamentos: '#0ea5e9', accesorios: '#f97316', cuidado: '#10b981', ofertas: '#dc2626' }

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <p className="m-0 text-[13px] text-slate-500 dark:text-slate-400">
                        Las subcategorías aparecen como filtros en la tienda web dentro de cada categoría.
                    </p>
                </div>
                <Button onClick={() => { setForm(SUBCAT_VACIA); setModal('crear') }}>
                    <IconMas />
                    Nueva subcategoría
                </Button>
            </div>

            {error && <p className="mb-3 text-[13px] text-red-500">{error}</p>}

            {cargando ? (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando...</p>
            ) : subcats.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm">No hay subcategorías todavía.</p>
                    <p className="mt-1 text-[13px]">
                        Creá las primeras, o ejecutá el SQL <code className="rounded bg-slate-50 px-1.5 py-0.5 dark:bg-slate-900">sql/subcategorias_ecommerce.sql</code> en Supabase para cargar las predeterminadas.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {CAT_SLUGS_LABELS.map(cat => {
                        const items = subcats.filter(x => x.categoria_slug === cat.slug).sort((a, b) => a.orden - b.orden)
                        if (!items.length) return null
                        const color = CAT_COLORS[cat.slug] || '#64748b'
                        return (
                            <div key={cat.slug}>
                                <div className="mb-2.5 flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
                                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{cat.label}</span>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">({items.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {items.map(sub => (
                                        <div
                                            key={sub.id}
                                            className="inline-flex items-center gap-1.5 rounded-full border py-1.5 pr-2.5 pl-3.5"
                                            style={{ borderColor: `${color}30`, background: `${color}0e` }}
                                        >
                                            <span className="text-[13px] font-semibold" style={{ color }}>{sub.nombre}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {ESPECIE_LABELS.find(e => e.valor === sub.especie)?.label || 'Ambos'}
                                            </span>
                                            <span className="mr-0.5 text-[10px] text-slate-400 dark:text-slate-500">#{sub.orden}</span>
                                            <button
                                                onClick={() => { setForm({ nombre: sub.nombre, categoria_slug: sub.categoria_slug, orden: sub.orden, especie: sub.especie || 'ambos' }); setModal(sub) }}
                                                className="flex cursor-pointer border-none bg-transparent p-0.5 text-slate-500 dark:text-slate-400"
                                                title="Editar"
                                            >
                                                <IconLapiz />
                                            </button>
                                            <button
                                                onClick={() => setConfirmar(sub)}
                                                className="flex cursor-pointer border-none bg-transparent p-0.5 text-red-500"
                                                title="Eliminar"
                                            >
                                                <IconBasura />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal crear/editar */}
            {modal !== null && (
                <Modal onClose={() => { setModal(null); setError('') }} title={modal === 'crear' ? 'Nueva subcategoría' : 'Editar subcategoría'} width={420}>
                    <div className="flex flex-col gap-3.5">
                        {error && <p className="m-0 text-[13px] text-red-500">{error}</p>}
                        <div>
                            <label className={labelCls}>Categoría</label>
                            <select value={form.categoria_slug} onChange={e => setForm(f => ({ ...f, categoria_slug: e.target.value }))} className={inputCls}>
                                {CAT_SLUGS_LABELS.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Especie</label>
                            <select value={form.especie} onChange={e => setForm(f => ({ ...f, especie: e.target.value }))} className={inputCls}>
                                {ESPECIE_LABELS.map(e => <option key={e.valor} value={e.valor}>{e.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Nombre</label>
                            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Adulto Mini" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Orden (menor = primero)</label>
                            <input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))} className={inputCls} />
                        </div>
                        <div className="mt-1 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setModal(null); setError('') }}>Cancelar</Button>
                            <Button onClick={guardar} disabled={guardando}>
                                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmar && (
                <ModalConfirmar
                    titulo="¿Eliminar subcategoría?"
                    mensaje={`Se eliminará "${confirmar.nombre}" y los productos asignados quedarán sin subcategoría.`}
                    textoBoton="Eliminar" colorBoton="#ef4444"
                    onConfirmar={() => eliminar(confirmar.id)}
                    onCancelar={() => setConfirmar(null)}
                />
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — FILTROS CONFIG
// ════════════════════════════════════════════════════════════════
const DISPLAY_AS_LABELS = { chip: 'Chip (arriba del grid)', sidebar: 'Sidebar (panel lateral)' }
const FILTRO_VACIO = { campo: '', label: '', valor: '', label_valor: '', categorias: [], display_as: 'sidebar', orden: 0, invisible: false }
const CAT_OPTS = [
    { v: 'perros', l: 'Perros' }, { v: 'gatos', l: 'Gatos' },
    { v: 'medicamentos', l: 'Medicamentos' }, { v: 'accesorios', l: 'Accesorios' },
    { v: 'cuidado', l: 'Cuidado' }, { v: 'ofertas', l: 'Ofertas' },
]

function TabFiltros() {
    const [rows, setRows] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [modal, setModal] = useState(null)
    const [form, setForm] = useState(FILTRO_VACIO)
    const [guardando, setGuardando] = useState(false)
    const [confirmar, setConfirmar] = useState(null)

    async function cargar() {
        setCargando(true)
        try { const { data } = await api.get('/ecommerce/admin/filtros-config'); setRows(data) }
        catch { setError('No se pudo cargar la configuración de filtros.') }
        finally { setCargando(false) }
    }
    useEffect(() => { cargar() }, [])

    async function guardar() {
        if (!form.campo.trim() || !form.label.trim() || !form.valor.trim() || !form.label_valor.trim())
            return setError('Todos los campos son requeridos.')
        setGuardando(true); setError('')
        try {
            if (modal === 'crear') {
                const { data } = await api.post('/ecommerce/admin/filtros-config', form)
                setRows(prev => [...prev, data])
            } else {
                const { data } = await api.patch(`/ecommerce/admin/filtros-config/${modal.id}`, form)
                setRows(prev => prev.map(x => x.id === modal.id ? data : x))
            }
            setModal(null)
        } catch (err) { setError(err.response?.data?.error || 'Error al guardar.') }
        finally { setGuardando(false) }
    }

    async function eliminar(id) {
        try { await api.delete(`/ecommerce/admin/filtros-config/${id}`); setRows(p => p.filter(x => x.id !== id)); setConfirmar(null) }
        catch { setError('Error al eliminar.') }
    }

    // Agrupar por campo
    const grupos = {}
    rows.forEach(r => {
        if (!grupos[r.campo]) grupos[r.campo] = { label: r.label, display_as: r.display_as, items: [] }
        grupos[r.campo].items.push(r)
    })

    const CHIP_COLOR = '#6366f1'; const SIDEBAR_COLOR = '#0ea5e9'

    return (
        <div>
            <div className="mb-5 flex items-start justify-between">
                <p className="m-0 max-w-[520px] text-[13px] text-slate-500 dark:text-slate-400">
                    Define los filtros que aparecen en el ecommerce por categoría. Chips se muestran arriba del grid; Sidebar se muestra en el panel lateral.
                </p>
                <Button onClick={() => { setForm(FILTRO_VACIO); setModal('crear') }}>
                    <IconMas />
                    Nuevo valor
                </Button>
            </div>

            {error && <p className="mb-3 text-[13px] text-red-500">{error}</p>}

            {cargando ? <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando...</p> : rows.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm">No hay filtros configurados.</p>
                    <p className="text-[13px]">Ejecutá <code className="rounded bg-slate-50 px-1.5 py-0.5 dark:bg-slate-900">sql/atributos_productos.sql</code> en Supabase para cargar los valores por defecto.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {Object.entries(grupos).map(([campo, { label, display_as, items }]) => {
                        const color = display_as === 'chip' ? CHIP_COLOR : SIDEBAR_COLOR
                        return (
                            <div key={campo}>
                                <div className="mb-2.5 flex items-center gap-2">
                                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{label}</span>
                                    <span
                                        className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                                        style={{ background: `${color}18`, color, borderColor: `${color}30` }}
                                    >
                                        {DISPLAY_AS_LABELS[display_as] || display_as}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{campo}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {items.sort((a, b) => a.orden - b.orden).map(item => (
                                        <div
                                            key={item.id}
                                            className="inline-flex items-center gap-1.5 rounded-full border py-1.5 pr-2.5 pl-3.5"
                                            style={{ borderColor: `${color}30`, background: `${color}0e` }}
                                        >
                                            <span className="text-[13px] font-semibold" style={{ color }}>{item.label_valor}</span>
                                            {item.invisible && <span className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-px text-[9px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">Solo dashboard</span>}
                                            <span className="mr-0.5 text-[10px] text-slate-400 dark:text-slate-500">"{item.valor}"</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">#{item.orden}</span>
                                            <button onClick={() => { setForm({ campo: item.campo, label: item.label, valor: item.valor, label_valor: item.label_valor, categorias: item.categorias || [], display_as: item.display_as, orden: item.orden, invisible: !!item.invisible }); setModal(item) }}
                                                className="flex cursor-pointer border-none bg-transparent p-0.5 text-slate-500 dark:text-slate-400">
                                                <IconLapiz />
                                            </button>
                                            <button onClick={() => setConfirmar(item)}
                                                className="flex cursor-pointer border-none bg-transparent p-0.5 text-red-500">
                                                <IconBasura />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {modal !== null && (
                <Modal onClose={() => { setModal(null); setError('') }} title={modal === 'crear' ? 'Nuevo valor de filtro' : 'Editar valor'} width={480}>
                    <div className="flex flex-col gap-3.5">
                        {error && <p className="m-0 text-[13px] text-red-500">{error}</p>}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Campo (clave interna)</label>
                                <input value={form.campo} onChange={e => setForm(f => ({ ...f, campo: e.target.value }))} placeholder="etapa_vida" className={`${inputCls} font-mono`} />
                            </div>
                            <div>
                                <label className={labelCls}>Label del grupo</label>
                                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Etapa de vida" className={inputCls} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Valor (clave guardada)</label>
                                <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="adulto" className={`${inputCls} font-mono`} />
                            </div>
                            <div>
                                <label className={labelCls}>Label visible</label>
                                <input value={form.label_valor} onChange={e => setForm(f => ({ ...f, label_valor: e.target.value }))} placeholder="Adulto" className={inputCls} />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Categorías (vacío = todas)</label>
                            <div className="flex flex-wrap gap-2">
                                {CAT_OPTS.map(({ v, l }) => {
                                    const activo = form.categorias?.includes(v)
                                    return (
                                        <button key={v} type="button"
                                            onClick={() => setForm(f => ({ ...f, categorias: activo ? f.categorias.filter(c => c !== v) : [...(f.categorias || []), v] }))}
                                            className={`rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${activo ? 'border-indigo-500 bg-violet-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                                            {l}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelCls}>Mostrar como</label>
                                <select value={form.display_as} onChange={e => setForm(f => ({ ...f, display_as: e.target.value }))} className={inputCls}>
                                    <option value="chip">Chip (arriba del grid)</option>
                                    <option value="sidebar">Sidebar (panel lateral)</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Orden</label>
                                <input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))} className={inputCls} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={labelCls}>Solo dashboard</label>
                                <div className="flex items-center gap-2 pt-1">
                                    <Switch checked={!!form.invisible} onCheckedChange={v => setForm(f => ({ ...f, invisible: v }))} />
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Oculto en tienda</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-1 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setModal(null); setError('') }}>Cancelar</Button>
                            <Button onClick={guardar} disabled={guardando}>
                                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmar && (
                <ModalConfirmar
                    titulo="¿Eliminar valor?"
                    mensaje={`Se eliminará "${confirmar.label_valor}" del filtro "${confirmar.label}". Los productos que lo tengan asignado conservarán el valor en sus atributos pero no aparecerá como opción de filtro.`}
                    textoBoton="Eliminar" colorBoton="#ef4444"
                    onConfirmar={() => eliminar(confirmar.id)}
                    onCancelar={() => setConfirmar(null)}
                />
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — BANNERS
// ════════════════════════════════════════════════════════════════
const BANNER_VACIO = { titulo: '', subtitulo: '', badge: '', cta_texto: '', cta_url: '', imagen_url: '', orden: 0, activo: true }

function TabBanners() {
    const [banners, setBanners] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [modal, setModal] = useState(null) // null | 'crear' | objeto (editar)
    const [form, setForm] = useState(BANNER_VACIO)
    const [guardando, setGuardando] = useState(false)
    const [confirmarEliminar, setConfirmarEliminar] = useState(null)

    async function cargar() {
        setCargando(true)
        try {
            const { data } = await api.get('/ecommerce/admin/banners')
            setBanners(data)
        } catch {
            setError('No se pudieron cargar los banners.')
        } finally {
            setCargando(false)
        }
    }
    useEffect(() => { cargar() }, [])

    function abrirCrear() {
        setForm(BANNER_VACIO)
        setModal('crear')
    }

    function abrirEditar(banner) {
        setForm({
            titulo: banner.titulo || '',
            subtitulo: banner.subtitulo || '',
            badge: banner.badge || '',
            cta_texto: banner.cta_texto || '',
            cta_url: banner.cta_url || '',
            imagen_url: banner.imagen_url || '',
            orden: banner.orden ?? 0,
            activo: banner.activo ?? true,
        })
        setModal(banner)
    }

    async function guardar() {
        if (!form.titulo.trim()) { setError('El título del banner es requerido.'); return }
        setGuardando(true)
        setError('')
        try {
            if (modal === 'crear') {
                const { data } = await api.post('/ecommerce/admin/banners', form)
                setBanners(b => [...b, data])
            } else {
                await api.patch(`/ecommerce/admin/banners/${modal.id}`, form)
                setBanners(b => b.map(x => x.id === modal.id ? { ...x, ...form } : x))
            }
            setModal(null)
        } catch {
            setError('Error al guardar el banner.')
        } finally {
            setGuardando(false)
        }
    }

    async function eliminar(id) {
        try {
            await api.delete(`/ecommerce/admin/banners/${id}`)
            setBanners(b => b.filter(x => x.id !== id))
            setConfirmarEliminar(null)
        } catch {
            setError('Error al eliminar el banner.')
        }
    }

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <Button onClick={abrirCrear}>
                    <IconMas />
                    Nuevo banner
                </Button>
            </div>

            {error && <p className="mb-3 text-[13px] text-red-500">{error}</p>}

            {cargando ? (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando banners...</p>
            ) : banners.length === 0 ? (
                <div className="py-10 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm">No hay banners configurados.</p>
                    <p className="text-[13px]">Creá uno para que aparezca en la tienda.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {banners.map(banner => (
                        <div key={banner.id} className="flex overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                            {/* Preview imagen */}
                            <div className="relative w-[120px] flex-shrink-0 overflow-hidden bg-slate-50 dark:bg-slate-900" style={{ minHeight: 80 }}>
                                {banner.imagen_url ? (
                                    <img src={banner.imagen_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center" style={{ minHeight: 80 }}>
                                        <span className="text-slate-400 dark:text-slate-500"><IconImagen /></span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{banner.titulo}</span>
                                    {banner.badge && <span className="rounded bg-[#ffa601] px-1.5 py-0.5 text-[10px] font-bold text-white">{banner.badge}</span>}
                                    <span className={`ml-auto text-[11px] font-semibold ${banner.activo ? 'text-green-500' : 'text-slate-400'}`}>
                                        {banner.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                {banner.subtitulo && <p className="m-0 text-xs text-slate-500 dark:text-slate-400">{banner.subtitulo}</p>}
                                <div className="mt-1 flex gap-3">
                                    {banner.cta_texto && <span className="text-[11px] text-slate-500 dark:text-slate-400">CTA: {banner.cta_texto}</span>}
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Orden: {banner.orden}</span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex flex-col justify-center gap-1.5 p-3">
                                <Button variant="outline" size="sm" onClick={() => abrirEditar(banner)}>Editar</Button>
                                <Button variant="destructive" size="sm" onClick={() => setConfirmarEliminar(banner)}>Eliminar</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal crear/editar */}
            {modal !== null && (
                <Modal onClose={() => { setModal(null); setError('') }} title={modal === 'crear' ? 'Nuevo banner' : 'Editar banner'} width={560}>
                    <div className="flex flex-col gap-3.5">
                        {error && <p className="m-0 text-[13px] text-red-500">{error}</p>}

                        {[
                            { key: 'titulo', label: 'Título *', placeholder: 'Gran promoción de temporada' },
                            { key: 'subtitulo', label: 'Subtítulo', placeholder: 'Descripción breve' },
                            { key: 'badge', label: 'Badge (ej: NUEVO, -20%)', placeholder: 'NUEVO' },
                            { key: 'cta_texto', label: 'Texto del botón CTA', placeholder: 'Ver productos' },
                            { key: 'cta_url', label: 'URL del botón CTA', placeholder: '/categoria/perros' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className={labelCls}>{label}</label>
                                <input
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    placeholder={placeholder}
                                    className={inputCls}
                                />
                            </div>
                        ))}

                        <div>
                            <label className={labelCls}>Imagen del banner</label>
                            <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                <strong className="text-slate-900 dark:text-slate-100">Tamano recomendado: 900 × 540 px</strong> (relacion 16:9)<br />
                                Minimo: 600 × 360 px — Formato: JPG, PNG o WEBP — Peso max: 2 MB<br />
                                La imagen ocupa <strong className="text-slate-900 dark:text-slate-100">solo el lado derecho</strong> del banner (columna derecha, aprox. 55% del ancho).<br />
                                <span className="text-orange-500">Pone el producto centrado o ligeramente a la derecha. Evita texto en la imagen porque se superpone con el badge.</span>
                            </div>
                            <InputImagen
                                value={form.imagen_url}
                                onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                            />
                            {form.imagen_url && (
                                <img src={form.imagen_url} alt="" className="mt-2 h-[120px] w-full rounded-lg object-cover" onError={e => { e.target.style.display = 'none' }} />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Orden</label>
                                <input
                                    type="number"
                                    value={form.orden}
                                    onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))}
                                    className={inputCls}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Activo</label>
                                <Switch checked={form.activo} onCheckedChange={v => setForm(f => ({ ...f, activo: v }))} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setModal(null); setError('') }}>Cancelar</Button>
                            <Button onClick={guardar} disabled={guardando}>
                                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear banner' : 'Guardar cambios'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmarEliminar && (
                <ModalConfirmar
                    titulo="¿Eliminar banner?"
                    mensaje={`Se eliminará el banner "${confirmarEliminar.titulo}". Esta acción no se puede deshacer.`}
                    onConfirmar={() => eliminar(confirmarEliminar.id)}
                    onCancelar={() => setConfirmarEliminar(null)}
                />
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — CATEGORÍAS
// ════════════════════════════════════════════════════════════════
const CAT_LABELS = {
    perros:       'Perros',
    gatos:        'Gatos',
    medicamentos: 'Medicamentos',
    accesorios:   'Accesorios',
    cuidado:      'Cuidado',
    ofertas:      'Ofertas',
}
const CAT_SLUGS = Object.keys(CAT_LABELS)

function TabCategorias() {
    const [cats, setCats] = useState([])
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(null) // slug o null
    const [error, setError] = useState('')
    const [exito, setExito] = useState('')

    useEffect(() => {
        api.get('/ecommerce/admin/categorias')
            .then(({ data }) => {
                // Asegurar que todos los slugs esten presentes
                const bySlug = {}
                data.forEach(c => { bySlug[c.slug] = c })
                setCats(CAT_SLUGS.map(slug => bySlug[slug] || { slug, imagen_url: null }))
            })
            .catch(() => {
                setCats(CAT_SLUGS.map(slug => ({ slug, imagen_url: null })))
                setError('No se pudieron cargar las categorías.')
            })
            .finally(() => setCargando(false))
    }, [])

    async function handleGuardar(slug, imagen_url) {
        setGuardando(slug)
        setError('')
        setExito('')
        try {
            await api.patch(`/ecommerce/admin/categorias/${slug}`, { imagen_url })
            setCats(prev => prev.map(c => c.slug === slug ? { ...c, imagen_url } : c))
            setExito(`Imagen de ${CAT_LABELS[slug]} guardada.`)
            setTimeout(() => setExito(''), 3000)
        } catch {
            setError('Error al guardar la imagen.')
        } finally {
            setGuardando(null)
        }
    }

    if (cargando) return <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando categorías...</p>

    return (
        <div>
            <p className="mt-0 mb-5 text-[13px] text-slate-500 dark:text-slate-400">
                Cargá una imagen para cada categoría. Se muestra en los tiles de la tienda web.
                Tamaño recomendado: <strong className="text-slate-900 dark:text-slate-100">600 × 400 px</strong>.
            </p>

            {error && <p className="mb-3 text-[13px] text-red-500">{error}</p>}
            {exito && <p className="mb-3 text-[13px] font-semibold text-green-500">{exito}</p>}

            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {cats.map(cat => (
                    <CatImageCard
                        key={cat.slug}
                        cat={cat}
                        label={CAT_LABELS[cat.slug]}
                        saving={guardando === cat.slug}
                        onSave={imagen_url => handleGuardar(cat.slug, imagen_url)}
                    />
                ))}
            </div>
        </div>
    )
}

function CatImageCard({ cat, label, saving, onSave }) {
    const [url, setUrl] = useState(cat.imagen_url || '')
    const inputRef = useRef(null)
    const [subiendo, setSubiendo] = useState(false)
    const [uploadError, setUploadError] = useState('')

    async function handleArchivo(e) {
        const file = e.target.files[0]
        if (!file) return
        setSubiendo(true)
        setUploadError('')
        try {
            const fd = new FormData()
            fd.append('imagen', file)
            const { data } = await api.post('/uploads/imagen', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            setUrl(data.url)
        } catch (err) {
            const msg = err?.response?.data?.error || 'Error al subir la imagen. Verificá la configuracion de Supabase Storage.'
            setUploadError(msg)
        } finally {
            setSubiendo(false)
        }
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#ffa601]" />
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</span>
            </div>

            {/* Preview */}
            <div className="flex h-[120px] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                {url ? (
                    <img src={url} alt={label} className="h-full w-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                ) : (
                    <span className="text-slate-400 dark:text-slate-500"><IconImagen size={32} /></span>
                )}
            </div>

            {/* URL input */}
            <div>
                <label className={labelCls}>URL de imagen</label>
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://... o subí un archivo"
                        className={`${inputCls} flex-1 text-xs`}
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={subiendo}
                        className="flex-shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-[11px] font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        {subiendo ? '...' : 'Subir'}
                    </button>
                    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleArchivo} />
                </div>
                {uploadError && (
                    <p className="mt-1.5 mb-0 text-[11px] text-red-500">{uploadError}</p>
                )}
            </div>

            <Button onClick={() => onSave(url)} disabled={saving || subiendo} className="justify-center">
                {saving ? 'Guardando...' : 'Guardar imagen'}
            </Button>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════
const CAMPOS_CONFIG = [
    { key: 'nombre_tienda',    label: 'Nombre de la tienda',     placeholder: 'Sosa Bulls',                     type: 'text' },
    { key: 'whatsapp',         label: 'Número de WhatsApp',      placeholder: '595981000000',                   type: 'text', hint: 'Sin espacios ni guiones. Ej: 595981000000' },
    { key: 'zona_cobertura',   label: 'Zona de cobertura',       placeholder: 'Asunción y Gran Asunción',       type: 'text' },
    { key: 'horario',          label: 'Horario de atención',     placeholder: 'Lun-Sab 8:00 - 18:00',          type: 'text' },
    { key: 'mensaje_retiro',   label: 'Mensaje WhatsApp (retiro)', placeholder: 'Hola, quiero retirar mi pedido en el local.', type: 'textarea' },
]

const TOGGLES_CONFIG = [
    { key: 'delivery_activo',    label: 'Habilitar delivery' },
    { key: 'retiro_activo',      label: 'Habilitar retiro en local' },
    { key: 'mostrar_sin_stock',  label: 'Mostrar productos sin stock', hint: 'Los clientes verán los productos pero con badge "Fuera de stock". Pueden seleccionar presentaciones sin stock pero no agregarlas al carrito.' },
]

function TabConfiguracion() {
    const [config, setConfig] = useState({})
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [exito, setExito] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        api.get('/ecommerce/admin/config')
            .then(({ data }) => {
                setConfig({
                    nombre_tienda: data.nombre_tienda || '',
                    whatsapp: data.whatsapp || '',
                    zona_cobertura: data.zona_cobertura || '',
                    horario: data.horario || '',
                    mensaje_retiro: data.mensaje_retiro || '',
                    delivery_activo: data.delivery_activo !== 'false',
                    retiro_activo: data.retiro_activo !== 'false',
                })
            })
            .catch(() => setError('No se pudo cargar la configuración.'))
            .finally(() => setCargando(false))
    }, [])

    async function guardar(e) {
        e.preventDefault()
        setGuardando(true)
        setError('')
        setExito(false)
        try {
            await api.put('/ecommerce/admin/config', {
                ...config,
                delivery_activo: String(config.delivery_activo),
                retiro_activo: String(config.retiro_activo),
            })
            setExito(true)
            setTimeout(() => setExito(false), 3000)
        } catch {
            setError('Error al guardar la configuración.')
        } finally {
            setGuardando(false)
        }
    }

    if (cargando) return <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando configuración...</p>

    return (
        <form onSubmit={guardar} className="max-w-[560px]">
            {error && <p className="mb-3 text-[13px] text-red-500">{error}</p>}
            {exito && <p className="mb-3 text-[13px] font-semibold text-green-500">Configuración guardada correctamente.</p>}

            <div className="flex flex-col gap-[18px]">
                {CAMPOS_CONFIG.map(({ key, label, placeholder, type, hint }) => (
                    <div key={key}>
                        <label className={labelCls}>{label}</label>
                        {type === 'textarea' ? (
                            <textarea
                                value={config[key] || ''}
                                onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                                placeholder={placeholder}
                                rows={3}
                                className={`${inputCls} resize-y`}
                            />
                        ) : (
                            <input
                                value={config[key] || ''}
                                onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                                placeholder={placeholder}
                                className={inputCls}
                            />
                        )}
                        {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
                    </div>
                ))}

                <div className="flex flex-col gap-2.5">
                    {TOGGLES_CONFIG.map(({ key, label, hint }) => (
                        <div key={key} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                            <Switch checked={config[key] !== false && config[key] !== 'false'} onCheckedChange={v => setConfig(c => ({ ...c, [key]: v }))} />
                            <div>
                                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{label}</span>
                                {hint && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
                            </div>
                        </div>
                    ))}
                </div>

                <div>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Guardar configuración'}
                    </Button>
                </div>
            </div>
        </form>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — TRAFICO
// ════════════════════════════════════════════════════════════════
function KpiCard({ label, valor, sub }) {
    return (
        <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-5 py-[18px] dark:border-slate-700 dark:bg-slate-900">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1.5 mb-0 text-[22px] font-extrabold text-slate-900 dark:text-slate-100">{valor}</p>
            {sub && <p className="mt-0.5 mb-0 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
    )
}

function TabTrafico() {
    const [periodo, setPeriodo] = useState('mes')
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        setCargando(true)
        setError('')
        api.get('/ecommerce/admin/estadisticas', { params: { periodo } })
            .then(({ data }) => setDatos(data))
            .catch(() => setError('No se pudieron cargar las estadísticas.'))
            .finally(() => setCargando(false))
    }, [periodo])

    const gs = v => `Gs. ${formatMiles(v)}`

    if (cargando) return <p className="text-[13px] text-slate-500 dark:text-slate-400">Cargando estadísticas...</p>
    if (error)    return <p className="text-[13px] text-red-500">{error}</p>
    if (!datos)   return null

    const {
        kpis          = {},
        por_dia       = [],
        por_entrega   = [],
        top_productos = [],
        nuevos_clientes = 0
    } = datos

    const safeArr = v => (Array.isArray(v) ? v : [])

    const maxDia      = safeArr(por_dia).reduce((m, d) => Math.max(m, parseInt(d.total)), 1)
    const totalEntrega = safeArr(por_entrega).reduce((s, r) => s + parseInt(r.cantidad), 0)

    const coloresEstado = { pendiente: '#f59e0b', confirmado: '#3b82f6', entregado: '#22c55e', cancelado: '#ef4444' }
    const estadosKpi = [
        { key: 'pendientes',  label: 'Pendientes',  color: coloresEstado.pendiente },
        { key: 'confirmados', label: 'Confirmados', color: coloresEstado.confirmado },
        { key: 'entregados',  label: 'Entregados',  color: coloresEstado.entregado },
        { key: 'cancelados',  label: 'Cancelados',  color: coloresEstado.cancelado },
    ]

    return (
        <div>
            {/* Selector de periodo */}
            <div className="mb-6 flex gap-1.5">
                {[{ key: 'semana', label: '7 dias' }, { key: 'mes', label: '30 dias' }, { key: 'trimestre', label: '90 dias' }].map(p => (
                    <button
                        key={p.key}
                        onClick={() => setPeriodo(p.key)}
                        className={`rounded-[7px] border border-slate-200 px-3.5 py-[7px] text-xs font-semibold dark:border-slate-700 ${periodo === p.key ? 'bg-[#1a1a2e] text-white' : 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}
                    >{p.label}</button>
                ))}
            </div>

            {/* KPIs principales */}
            <div className="mb-6 grid grid-cols-4 gap-3.5">
                <KpiCard label="Total pedidos"    valor={formatMiles(kpis.total_pedidos)}  sub="en el periodo" />
                <KpiCard label="Ingresos"         valor={gs(kpis.total_ingresos)}          sub="ecommerce" />
                <KpiCard label="Ticket promedio"  valor={gs(Math.round(kpis.ticket_promedio))} sub="por pedido" />
                <KpiCard label="Nuevos clientes"  valor={formatMiles(nuevos_clientes)}     sub="registrados via web" />
            </div>

            {/* Estados de pedidos */}
            <div className="mb-6 grid grid-cols-4 gap-2.5">
                {estadosKpi.map(e => (
                    <div key={e.key} className="flex items-center gap-2.5 rounded-[9px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: e.color }} />
                        <div>
                            <p className="m-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{e.label}</p>
                            <p className="m-0 text-lg font-extrabold text-slate-900 dark:text-slate-100">{kpis[e.key] || 0}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pedidos por dia + Delivery vs Retiro */}
            <div className="mb-6 grid grid-cols-[2fr_1fr] gap-5">
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-5 mt-0 text-sm font-bold text-slate-900 dark:text-slate-100">Pedidos por dia</h3>
                    {safeArr(por_dia).length === 0 ? (
                        <div className="flex h-40 items-center justify-center text-[13px] text-slate-400 dark:text-slate-500">Sin pedidos en este periodo</div>
                    ) : (
                        <div className="flex h-40 items-end gap-1">
                            {safeArr(por_dia).map((d, i) => {
                                const altura = Math.max((parseInt(d.total) / maxDia) * 100, 3)
                                const fecha = new Date(d.fecha)
                                const label = `${fecha.getDate()}/${fecha.getMonth() + 1}`
                                return (
                                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                                        <div
                                            title={`${gs(d.total)} — ${d.cantidad} pedidos`}
                                            className="w-full rounded-t-[3px] bg-[#1a1a2e] transition-[height] duration-300 dark:bg-indigo-600"
                                            style={{ height: `${altura}%`, minHeight: 4 }}
                                        />
                                        <p className="m-0 text-center text-[8px] text-slate-400 dark:text-slate-500">{label}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-5 mt-0 text-sm font-bold text-slate-900 dark:text-slate-100">Tipo de entrega</h3>
                    {safeArr(por_entrega).length === 0 ? (
                        <div className="flex h-[100px] items-center justify-center text-[13px] text-slate-400 dark:text-slate-500">Sin datos</div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {safeArr(por_entrega).map((e, i) => {
                                const pct = totalEntrega > 0 ? Math.round((parseInt(e.cantidad) / totalEntrega) * 100) : 0
                                const colores = ['#3b82f6', '#f59e0b', '#22c55e']
                                return (
                                    <div key={i}>
                                        <div className="mb-1 flex justify-between">
                                            <span className="text-xs font-semibold capitalize text-slate-900 dark:text-slate-100">{e.tipo_entrega || 'delivery'}</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{pct}% ({e.cantidad})</span>
                                        </div>
                                        <div className="h-[7px] overflow-hidden rounded bg-slate-100 dark:bg-slate-700">
                                            <div className="h-full rounded transition-[width] duration-500" style={{ width: `${pct}%`, background: colores[i % colores.length] }} />
                                        </div>
                                        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{gs(e.total)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Top productos */}
            <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 mt-0 text-sm font-bold text-slate-900 dark:text-slate-100">Top productos mas pedidos</h3>
                {safeArr(top_productos).length === 0 ? (
                    <p className="text-[13px] text-slate-400 dark:text-slate-500">Sin datos en este periodo.</p>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {['#', 'Producto', 'Presentacion', 'Unidades', 'Total'].map(h => (
                                    <th key={h} className={`border-b border-slate-200 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400 ${h === '#' || h === 'Unidades' || h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {safeArr(top_productos).map((p, i) => {
                                const maxUnidades = parseInt(safeArr(top_productos)[0]?.unidades || 1)
                                const pct = Math.round((parseInt(p.unidades) / maxUnidades) * 100)
                                return (
                                    <tr key={i} className="border-b border-slate-200 dark:border-slate-700">
                                        <td className="px-2.5 py-2.5 text-right text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}</td>
                                        <td className="px-2.5 py-2.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                                            {p.nombre}
                                            <div className="mt-1 h-[3px] max-w-[180px] overflow-hidden rounded bg-slate-100 dark:bg-slate-700">
                                                <div className="h-full rounded bg-[#1a1a2e] dark:bg-indigo-600" style={{ width: `${pct}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-2.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">{p.presentacion}</td>
                                        <td className="px-2.5 py-2.5 text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">{formatMiles(p.unidades)}</td>
                                        <td className="px-2.5 py-2.5 text-right text-xs text-slate-500 dark:text-slate-400">{gs(p.total)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — PEDIDOS WEB
// ════════════════════════════════════════════════════════════════
function TabPedidos() {
    const [pedidos, setPedidos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('')
    const [confirmar, setConfirmar] = useState(null)

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const params = filtroEstado ? { estado: filtroEstado } : {}
            const { data } = await api.get('/ecommerce/admin/pedidos', { params })
            setPedidos(data)
        } catch { setPedidos([]) }
        finally { setCargando(false) }
    }, [filtroEstado])

    useEffect(() => { cargar() }, [cargar])

    async function handleEliminar(pedido) {
        setConfirmar({
            titulo: 'Eliminar pedido',
            mensaje: `¿Eliminar pedido ${pedido.numero_pedido}? Esta accion no se puede deshacer.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await api.delete(`/ecommerce/admin/pedidos/${pedido.id}`)
                    setConfirmar(null)
                    await cargar()
                } catch (err) {
                    setConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo eliminar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setConfirmar(null) })
                }
            }
        })
    }

    const ESTADOS = { pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' }, confirmado: { label: 'Confirmado', color: '#3b82f6', bg: '#eff6ff' }, entregado: { label: 'Entregado', color: '#10b981', bg: '#f0fdf4' }, cancelado: { label: 'Cancelado', color: '#6b7280', bg: '#f9fafb' } }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-[15px] font-bold text-slate-900 dark:text-slate-100">Pedidos de la tienda web</h3>
                <div className="flex items-center gap-2">
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={`${inputCls} py-2 px-3`}>
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={cargar}>↻</Button>
                </div>
            </div>

            {cargando ? (
                <p className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">Cargando pedidos...</p>
            ) : pedidos.length === 0 ? (
                <p className="py-12 text-center text-[13px] text-slate-500 dark:text-slate-400">No hay pedidos{filtroEstado ? ` con estado "${filtroEstado}"` : ''}.</p>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900">
                            {['N° Pedido', 'Cliente', 'Entrega', 'Estado', 'Fecha', ''].map(h => (
                                <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pedidos.map(p => {
                            const est = ESTADOS[p.estado] || ESTADOS.pendiente
                            return (
                                <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{p.numero_pedido}</td>
                                    <td className="px-3 py-2.5">
                                        <p className="m-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{p.cliente_nombre || '—'}</p>
                                        <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400">{p.cliente_telefono || ''}</p>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{p.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro'}</td>
                                    <td className="px-3 py-2.5">
                                        <span className="rounded-[20px] px-2.5 py-[3px] text-[11px] font-bold" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{formatearSoloFecha(p.created_at)}</td>
                                    <td className="px-3 py-2.5 text-right">
                                        <Button variant="destructive" size="sm" onClick={() => handleEliminar(p)}>
                                            <IconBasura />
                                            Eliminar
                                        </Button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}

            {confirmar && (
                <ModalConfirmar
                    titulo={confirmar.titulo}
                    mensaje={confirmar.mensaje}
                    textoBoton={confirmar.textoBoton}
                    colorBoton={confirmar.colorBoton}
                    onConfirmar={confirmar.onConfirmar}
                    onCancelar={() => setConfirmar(null)}
                />
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL — TIENDA WEB
// ════════════════════════════════════════════════════════════════
const TABS = [
    { key: 'productos',      label: 'Productos' },
    { key: 'filtros',        label: 'Filtros' },
    { key: 'subcategorias',  label: 'Subcategorías' },
    { key: 'categorias',     label: 'Categorias' },
    { key: 'banners',        label: 'Banners' },
    { key: 'configuracion',  label: 'Configuración' },
    { key: 'trafico',        label: 'Trafico' },
]

function TiendaWeb() {
    const [tab, setTab] = useState('productos')

    return (
        <div className="page-scroll min-h-full bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            {/* Header */}
            <div className="mb-6">
                <h1 className="m-0 text-[22px] font-bold text-slate-900 dark:text-slate-100">Tienda Web</h1>
                <p className="mt-1 mb-0 text-[13px] text-slate-500 dark:text-slate-400">Gestioná productos, banners y configuración de tu tienda online.</p>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex w-fit gap-1 rounded-[10px] border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`rounded-[7px] border-none px-4.5 py-2 text-xs font-semibold transition-all ${tab === t.key ? 'bg-[#1a1a2e] text-white' : 'bg-transparent text-slate-500 dark:text-slate-400'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                {tab === 'productos'     && <TabProductos />}
                {tab === 'filtros'       && <TabFiltros />}
                {tab === 'subcategorias' && <TabSubcategorias />}
                {tab === 'categorias'    && <TabCategorias />}
                {tab === 'banners'       && <TabBanners />}
                {tab === 'configuracion' && <TabConfiguracion />}
                {tab === 'trafico'       && <TabTrafico />}
            </div>
        </div>
    )
}

export default TiendaWeb
