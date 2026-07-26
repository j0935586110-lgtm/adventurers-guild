export async function verifyQuest(questId: string, userId: string) {
  const response = await fetch(`/api/quests/${questId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify quest');
  }
  return response.json();
}

export async function adjustCoins(targetUserId: string, amount: number, reason: string, adminId: string) {
  const response = await fetch('/api/admin/adjust-coins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, amount, reason, adminId })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to adjust coins');
  }
  return response.json();
}
