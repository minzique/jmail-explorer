import type {
  SearchResponse,
  ThreadResponse,
  EntityListResponse,
  EntityDetailResponse,
  GraphData,
  TimelineResponse,
  Stats,
  PersonResponse,
  TopRelationship,
} from './types'

const BASE = ''

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}

export function search(q: string, page = 1, limit = 20): Promise<SearchResponse> {
  return fetchJson(`/api/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`)
}

export function getThread(docId: string): Promise<ThreadResponse> {
  return fetchJson(`/api/threads/${encodeURIComponent(docId)}`)
}

export function getEntities(
  page = 1,
  limit = 50,
  sort = 'message_count',
  order = 'desc',
  searchQuery = ''
): Promise<EntityListResponse> {
  return fetchJson(
    `/api/entities?page=${page}&limit=${limit}&sort=${sort}&order=${order}&search=${encodeURIComponent(searchQuery)}`
  )
}

export function getEntity(email: string): Promise<EntityDetailResponse> {
  return fetchJson(`/api/entities/${encodeURIComponent(email)}`)
}

export function getGraph(minWeight = 10, limit = 100): Promise<GraphData> {
  return fetchJson(`/api/graph?min_weight=${minWeight}&limit=${limit}`)
}

export function getEgoGraph(email: string, depth = 1): Promise<GraphData> {
  return fetchJson(`/api/graph/ego/${encodeURIComponent(email)}?depth=${depth}`)
}

export function getTimeline(): Promise<TimelineResponse> {
  return fetchJson('/api/timeline')
}

export function getStats(): Promise<Stats> {
  return fetchJson('/api/stats')
}

export function getPerson(email: string): Promise<PersonResponse> {
  return fetchJson(`/api/person/${encodeURIComponent(email)}`)
}

export function getRelationshipGraph(
  minWeight = 3, limit = 150, relType = ''
): Promise<GraphData> {
  const params = `min_weight=${minWeight}&limit=${limit}&rel_type=${encodeURIComponent(relType)}`
  return fetchJson(`/api/graph/relationships?${params}`)
}

export function getTopRelationships(
  limit = 50, relType = '', excludeEpstein = false
): Promise<{ relationships: TopRelationship[] }> {
  const params = `limit=${limit}&rel_type=${encodeURIComponent(relType)}&exclude_epstein=${excludeEpstein}`
  return fetchJson(`/api/relationships/top?${params}`)
}
