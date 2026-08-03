export const CLIENTES_REGIONES_META = Object.freeze([
  {
    key: 'andes',
    title: 'Andes',
    aliases: ['ANDES'],
    franquiciasEsperadas: [],
    description:
      'Consolidado regional del eje Andes para la lectura operativa diaria.',
  },
  {
    key: 'centro',
    title: 'Centro',
    aliases: ['CENTRO'],
    franquiciasEsperadas: [],
    description:
      'Consolidado regional del eje Centro para el comparativo de cartera.',
  },
  {
    key: 'llanos',
    title: 'Llanos',
    aliases: ['LLANOS'],
    franquiciasEsperadas: ['Acarigua', 'Guanare'],
    description:
      'Macro-región operativa que consolida Acarigua y Guanare en una sola vista.',
  },
])

export const CLIENTES_REGION_LOOKUP = Object.freeze(
  CLIENTES_REGIONES_META.reduce((accumulator, region) => {
    accumulator[region.key] = region
    return accumulator
  }, {}),
)

export function getClientesRegionMeta(regionKey = '') {
  const normalizedKey = String(regionKey || '').trim().toLowerCase()
  return CLIENTES_REGION_LOOKUP[normalizedKey] || null
}

export function getClientesRegionKeys() {
  return CLIENTES_REGIONES_META.map((region) => region.key)
}
