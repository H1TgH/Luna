const ONLINE_THRESHOLD_MS = 3 * 60 * 1000 // 3 минуты

export function isOnline(lastSeenIso: string | null | undefined): boolean {
  if (!lastSeenIso) return false
  const lastSeen = new Date(lastSeenIso).getTime()
  const now = Date.now()
  return now - lastSeen < ONLINE_THRESHOLD_MS
}

export function formatLastSeen(lastSeenIso: string | null | undefined): string {
  if (!lastSeenIso) return 'Не в сети'

  const lastSeen = new Date(lastSeenIso)
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'только что в сети'
  if (diffMin < 60) return `был(а) ${diffMin} мин. назад`
  if (diffHour < 24) return `был(а) ${diffHour} ч. назад`
  if (diffDay === 1) return 'был(а) вчера'
  if (diffDay < 7) return `был(а) ${diffDay} дн. назад`

  return `был(а) ${lastSeen.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
}