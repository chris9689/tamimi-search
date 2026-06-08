export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { region, sectionId, ...dyPayload } = req.body;

  // Configuration-driven endpoint selection
  const dyRegion = region || 'US';
  const dySectionId = sectionId || '8770123';
  const baseUrl = dyRegion === 'EU' ? 'https://recs-search-eu.dynamicyield.com/search/' : 'https://recs-search.dynamicyield.com/search/';

  try {
    const response = await fetch(`${baseUrl}${dySectionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dyPayload),
    });

    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { error: text }; }

    res.status(response.status).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = (error as any)?.cause?.code ?? (error as any)?.cause?.message ?? '';
    res.status(500).json({ error: 'Proxy error', message, ...(cause ? { cause } : {}) });
  }
}