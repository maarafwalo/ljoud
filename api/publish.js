export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server not configured' });

  const { hiddenIds } = req.body;
  if (!Array.isArray(hiddenIds)) return res.status(400).json({ error: 'Invalid payload' });

  const GH_API = 'https://api.github.com/repos/maarafwalo/ljoud/contents/index.html';
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // Fetch current index.html
  const fileRes = await fetch(GH_API, { headers });
  if (!fileRes.ok) return res.status(502).json({ error: 'Failed to fetch file from GitHub' });
  const fileData = await fileRes.json();

  const rawContent = decodeURIComponent(
    atob(fileData.content.replace(/\n/g, ''))
      .split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );

  // Patch HIDDEN_IDS
  const patched = rawContent.replace(
    /\/\*HIDDEN_START\*\/.*?\/\*HIDDEN_END\*\//,
    `/*HIDDEN_START*/${JSON.stringify(hiddenIds)}/*HIDDEN_END*/`
  );

  if (patched === rawContent) return res.status(400).json({ error: 'HIDDEN marker not found' });

  const newContent = btoa(unescape(encodeURIComponent(patched)));

  const updateRes = await fetch(GH_API, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message: 'update: sync hidden products', content: newContent, sha: fileData.sha })
  });

  if (updateRes.ok) {
    res.status(200).json({ ok: true });
  } else {
    const err = await updateRes.json();
    res.status(502).json({ error: err.message || 'GitHub update failed' });
  }
}
