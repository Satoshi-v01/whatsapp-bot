const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { manejarError } = require('../middleware/validar')
const { autenticar, verificarPermiso } = require('../middleware/auth')

// Alertas de reposicion: para cada cliente + producto (balanceados) que compro
// al menos una vez, estima cuando le va a hacer falta reponer basandose en el
// intervalo real entre sus propias compras (si compro 2+ veces ese producto) o,
// si es la primera vez, en el intervalo promedio que tardan otros clientes en
// reponer ese mismo producto.
router.get('/', autenticar, verificarPermiso('clientes', 'ver'), async (req, res) => {
    try {
        const diasUmbral = parseInt(req.query.dias_umbral) || 5

        const resultado = await db.query(
            `WITH ventas_balanceados AS (
                SELECT v.cliente_id, v.presentacion_id,
                    COALESCE(v.numero_factura, v.id::text) as factura,
                    MIN(v.created_at) as fecha
                FROM ventas v
                JOIN presentaciones pr ON v.presentacion_id = pr.id
                JOIN productos p ON pr.producto_id = p.id
                JOIN clientes cl ON cl.id = v.cliente_id
                WHERE v.estado != 'cancelado'
                    AND v.cliente_id IS NOT NULL
                    AND cl.tipo != 'consumidor_final'
                    AND p.seccion_inventario = 'balanceados'
                GROUP BY v.cliente_id, v.presentacion_id, COALESCE(v.numero_factura, v.id::text)
            ),
            intervalos AS (
                SELECT cliente_id, presentacion_id, fecha,
                    fecha - LAG(fecha) OVER (PARTITION BY cliente_id, presentacion_id ORDER BY fecha) as diff
                FROM ventas_balanceados
            ),
            promedio_cliente AS (
                SELECT cliente_id, presentacion_id, AVG(EXTRACT(EPOCH FROM diff) / 86400) as dias_promedio
                FROM intervalos
                WHERE diff IS NOT NULL
                GROUP BY cliente_id, presentacion_id
            ),
            promedio_global AS (
                SELECT presentacion_id, AVG(dias_promedio) as dias_promedio_global
                FROM promedio_cliente
                GROUP BY presentacion_id
            ),
            stats AS (
                SELECT cliente_id, presentacion_id, COUNT(*) as total_compras, MAX(fecha) as ultima_compra
                FROM ventas_balanceados
                GROUP BY cliente_id, presentacion_id
            ),
            calculado AS (
                SELECT
                    s.cliente_id, s.presentacion_id, s.total_compras, s.ultima_compra,
                    ROUND(COALESCE(pc.dias_promedio, pg.dias_promedio_global)::numeric, 1) as dias_estimados,
                    (pc.dias_promedio IS NOT NULL) as con_historial_propio,
                    (s.ultima_compra + (COALESCE(pc.dias_promedio, pg.dias_promedio_global) || ' days')::interval) as proxima_reposicion_estimada
                FROM stats s
                LEFT JOIN promedio_cliente pc ON pc.cliente_id = s.cliente_id AND pc.presentacion_id = s.presentacion_id
                LEFT JOIN promedio_global pg ON pg.presentacion_id = s.presentacion_id
                WHERE COALESCE(pc.dias_promedio, pg.dias_promedio_global) IS NOT NULL
            )
            SELECT
                cal.cliente_id, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
                cal.presentacion_id, pr.nombre as presentacion_nombre, p.nombre as producto_nombre, m.nombre as marca_nombre,
                cal.total_compras, cal.ultima_compra, cal.dias_estimados, cal.con_historial_propio,
                cal.proxima_reposicion_estimada,
                EXTRACT(DAY FROM (cal.proxima_reposicion_estimada - NOW()))::int as dias_restantes
            FROM calculado cal
            JOIN clientes c ON c.id = cal.cliente_id
            JOIN presentaciones pr ON pr.id = cal.presentacion_id
            JOIN productos p ON p.id = pr.producto_id
            LEFT JOIN marcas m ON m.id = p.marca_id
            WHERE c.activo = true
                AND cal.proxima_reposicion_estimada <= NOW() + ($1 || ' days')::interval
            ORDER BY cal.proxima_reposicion_estimada ASC`,
            [diasUmbral]
        )

        res.json(resultado.rows)
    } catch (error) {
        manejarError(res, error)
    }
})

module.exports = router
