// Same-origin, read-only bridge to a PUBLIC NodeBB user profile.
// No tokens, no publishing privileges, no user email or other private fields.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const name = req.query?.username;
  if (typeof name !== 'string' || !/^[\p{L}\p{N}_. @-]{1,60}$/u.test(name)) {
    return res.status(400).json({ error: 'Invalid public username' });
  }
  try {
    const upstream = await fetch('https://forum.928174.xyz/api/user/' + encodeURIComponent(name), {
      headers: { 'Accept': 'application/json', 'User-Agent': 'adventurers-guild-profile-bridge/1.0' },
      signal: AbortSignal.timeout(7000)
    });
    if (upstream.status === 404) return res.status(404).json({ error: 'Forum profile not found' });
    if (!upstream.ok) return res.status(502).json({ error: 'Forum unavailable' });
    const source = await upstream.json();
    const member = source?.user || source;
    if (!member || !Number.isSafeInteger(Number(member.uid)) || Number(member.uid) <= 0) {
      return res.status(404).json({ error: 'Forum profile not found' });
    }
    const slug = typeof member.userslug === 'string' ? member.userslug : name;
    return res.status(200).json({
      username: String(member.username || name).slice(0,80),
      url: 'https://forum.928174.xyz/user/' + encodeURIComponent(slug),
      topiccount: Math.max(0, Number(member.topiccount) || 0),
      postcount: Math.max(0, Number(member.postcount) || 0),
      reputation: Number(member.reputation) || 0,
      verified: false
    });
  } catch {
    return res.status(502).json({ error: 'Forum unavailable' });
  }
}
