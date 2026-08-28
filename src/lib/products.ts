import { PRODUCTS_STALE_MS } from './config'
import { productsStore } from './db'
import { pgSelect } from './api'
import type { CachedProducts, Product } from './types'

interface RawRow {
  barcode: string | null
  item_code: string | null
  name: string | null
  packing_size: string | null
  sort_order: number | null
}

export async function fetchProducts(listKey: string): Promise<Product[]> {
  let data: RawRow[]
  try {
    data = await pgSelect<RawRow[]>('app_product_list_items', {
      select: 'barcode,item_code,name,packing_size,sort_order',
      list_key: `eq.${listKey}`,
      order: 'sort_order',
    })
  } catch (err) {
    throw new Error(
      `读取产品清单失败 / Failed to load product list: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (!data || data.length === 0) {
    throw new Error(
      '产品清单是空的,请先在资料库里建立 / Product list is empty — create it in the database first',
    )
  }

  return data.map((r, i) => {
    const barcode = String(r.barcode ?? r.item_code ?? '').trim()
    const itemCode = String(r.item_code ?? r.barcode ?? '').trim()
    return {
      barcode,
      itemCode,
      name: String(r.name ?? '(未命名)').trim(),
      packaging: String(r.packing_size ?? '').trim(),
      sortOrder: r.sort_order ?? i,
    }
  })
}

export async function getCachedProducts(listKey: string): Promise<CachedProducts | undefined> {
  return productsStore.get(listKey)
}

export async function refreshProducts(listKey: string): Promise<CachedProducts> {
  const items = await fetchProducts(listKey)
  const cached: CachedProducts = { listKey, items, fetchedAt: Date.now() }
  await productsStore.put(cached)
  return cached
}

export function isStale(cached: CachedProducts | undefined): boolean {
  return !cached || Date.now() - cached.fetchedAt > PRODUCTS_STALE_MS
}
