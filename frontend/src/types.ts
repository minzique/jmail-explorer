export interface SearchResult {
  message_id: string
  doc_id: string
  sender_name: string
  sender_email: string
  subject: string
  snippet: string
  sent_at: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  error?: string
}

export interface Thread {
  doc_id: string
  subject: string
  message_count: number
  latest_date: string
  preview: string
  is_sent: number
  star_count: number
  has_redactions: number
  attachment_count: number
}

export interface Recipient {
  address: string
  name: string
  type: 'to' | 'cc' | 'bcc'
}

export interface Message {
  id: string
  doc_id: string
  message_index: number
  sender: string
  sender_name: string
  sender_email: string
  subject: string
  sent_at: string
  content_markdown: string
  content_html: string
  attachment_count: number
  is_from_epstein: number
  preview: string
  account_email: string
  recipients: Recipient[]
}

export interface ThreadResponse {
  thread: Thread
  messages: Message[]
}

export interface Entity {
  id: number
  email: string
  name: string
  message_count: number
  is_epstein: number
}

export interface EntityListResponse {
  entities: Entity[]
  total: number
  page: number
  limit: number
}

export interface Connection {
  email: string
  name: string
  message_count: number
  is_epstein: number
  connection_weight: number
}

export interface RecentMessage {
  id: string
  doc_id: string
  subject: string
  sent_at: string
  preview: string
  is_from_epstein: number
}

export interface EntityDetailResponse {
  entity: Entity
  connections: Connection[]
  recent_messages: RecentMessage[]
}

export interface GraphNode {
  id: string
  name: string
  email: string
  count: number
  is_epstein: number
  connections?: number
  role?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  weight: number
  type?: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface PersonProfile {
  email: string
  canonical_name: string
  all_names: string[]
  all_emails: string[]
  role: string
  first_active: string
  last_active: string
  total_messages: number
  total_threads: number
  total_connections: number
  is_epstein: number
}

export interface PersonConnection {
  email: string
  name: string
  types: Record<string, number>
  total_weight: number
  first_seen: string
  last_seen: string
}

export interface PersonActivityEntry {
  month: string
  cnt: number
}

export interface MentionSummary {
  mention_type: string
  cnt: number
}

export interface PersonResponse {
  profile: PersonProfile
  connections: PersonConnection[]
  recent_sent: RecentMessage[]
  recent_received: (RecentMessage & { sender_name?: string })[]
  activity_timeline: PersonActivityEntry[]
  mention_summary: MentionSummary[]
}

export interface RelationshipDetail {
  relationship_type: string
  weight: number
  first_seen: string
  last_seen: string
  sample_doc_id: string
  context: string | null
}

export interface TopRelationship {
  entity_a: string
  entity_b: string
  relationship_type: string
  weight: number
  first_seen: string
  last_seen: string
  sample_doc_id: string
  name_a: string
  name_b: string
  role_a: string
  role_b: string
}

export interface RelTypeCount {
  relationship_type: string
  cnt: number
  total_weight: number
}

export interface TopConnected {
  email: string
  canonical_name: string
  total_connections: number
  total_messages: number
  role: string
}

export interface TimelineEntry {
  month: string
  message_count: number
}

export interface TimelineResponse {
  timeline: TimelineEntry[]
}

export interface TopSender {
  sender_email: string
  sender_name: string
  cnt: number
}

export interface TopDomain {
  domain: string
  cnt: number
}

export interface Stats {
  threads: number
  messages: number
  entities: number
  edges: number
  relationships: number
  profiles: number
  min_date: string | null
  max_date: string | null
  top_senders: TopSender[]
  top_domains: TopDomain[]
  relationships_by_type: RelTypeCount[]
  top_connected: TopConnected[]
}

export type ViewName = 'search' | 'network' | 'entities' | 'person' | 'timeline' | 'stats'
