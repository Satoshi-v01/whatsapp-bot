import api from './api'

export async function getProductos() {
    const res = await api.get('/productos')
    return res.data
}

export async function getCategorias(seccion) {
    const res = await api.get('/productos/categorias', seccion ? { params: { seccion } } : undefined)
    return res.data
}

export async function getMarcas() {
    const res = await api.get('/productos/marcas')
    return res.data
}

export async function crearMarca(datos) {
    const res = await api.post('/productos/marcas', datos)
    return res.data
}

export async function verificarEliminarMarca(id) {
    const res = await api.delete(`/productos/marcas/${id}`)
    return res.data
}

export async function confirmarEliminarMarca(id) {
    const res = await api.delete(`/productos/marcas/${id}/confirmar`)
    return res.data
}

export async function crearCategoria(datos) {
    const res = await api.post('/productos/categorias', datos)
    return res.data
}

export async function editarCategoria(id, datos) {
    const res = await api.patch(`/productos/categorias/${id}`, datos)
    return res.data
}

export async function verificarEliminarCategoria(id) {
    const res = await api.delete(`/productos/categorias/${id}`)
    return res.data
}

export async function confirmarEliminarCategoria(id) {
    const res = await api.delete(`/productos/categorias/${id}/confirmar`)
    return res.data
}

export async function crearProducto(datos) {
    const res = await api.post('/productos', datos)
    return res.data
}

export async function editarProducto(id, datos) {
    const res = await api.patch(`/productos/${id}`, datos)
    return res.data
}

export async function agregarPresentacion(productoId, datos) {
    const res = await api.post(`/productos/${productoId}/presentaciones`, datos)
    return res.data
}

export async function actualizarStock(presentacionId, stock) {
    const res = await api.patch(`/productos/presentaciones/${presentacionId}/stock`, { stock })
    return res.data
}

export async function actualizarPrecio(presentacionId, datos) {
    const res = await api.patch(`/productos/presentaciones/${presentacionId}/precio`, datos)
    return res.data
}

export async function actualizarDisponible(presentacionId, disponible) {
    const res = await api.patch(`/productos/presentaciones/${presentacionId}/disponible`, { disponible })
    return res.data
}

export async function toggleDisponibleProducto(id, disponible) {
    const res = await api.patch(`/productos/${id}/disponible`, { disponible })
    return res.data
}

export async function actualizarCodigoBarras(id, codigo_barras) {
    const res = await api.patch(`/productos/presentaciones/${id}/codigos`, { codigo_barras })
    return res.data
}

export async function buscarPorCodigoBarras(codigo) {
    const res = await api.get(`/productos/codigo-barras/${encodeURIComponent(codigo)}`)
    return res.data
}

export async function getSubcategorias(seccion) {
    const res = await api.get('/productos/subcategorias', seccion ? { params: { seccion } } : undefined)
    return res.data
}

export async function crearSubcategoria(datos) {
    const res = await api.post('/productos/subcategorias', datos)
    return res.data
}

export async function editarSubcategoria(id, datos) {
    const res = await api.patch(`/productos/subcategorias/${id}`, datos)
    return res.data
}

export async function verificarEliminarSubcategoria(id) {
    const res = await api.delete(`/productos/subcategorias/${id}`)
    return res.data
}

export async function confirmarEliminarSubcategoria(id) {
    const res = await api.delete(`/productos/subcategorias/${id}/confirmar`)
    return res.data
}

export async function getSecciones() {
    const res = await api.get('/productos/secciones')
    return res.data
}

export async function crearSeccion(datos) {
    const res = await api.post('/productos/secciones', datos)
    return res.data
}

export async function editarSeccion(id, datos) {
    const res = await api.patch(`/productos/secciones/${id}`, datos)
    return res.data
}

export async function eliminarSeccion(id) {
    const res = await api.delete(`/productos/secciones/${id}`)
    return res.data
}

export async function eliminarPresentacion(id) {
    const res = await api.delete(`/productos/presentaciones/${id}`)
    return res.data
}

export async function eliminarProducto(id) {
    const res = await api.delete(`/productos/${id}`)
    return res.data
}
export async function importarProductos(filas) {
    const res = await api.post('/productos/importar', { filas })
    return res.data
}

export async function descargarTemplateStock() {
    const res = await api.get('/productos/template-stock', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_stock.xlsx'
    a.click()
    URL.revokeObjectURL(url)
}

export async function importarStock(filas) {
    const res = await api.post('/productos/importar-stock', { filas })
    return res.data
}
