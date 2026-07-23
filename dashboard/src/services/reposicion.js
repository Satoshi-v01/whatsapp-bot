import api from './api'

export async function getAlertasReposicion(diasUmbral = 5) {
    const res = await api.get(`/reposicion?dias_umbral=${diasUmbral}`)
    return res.data
}
