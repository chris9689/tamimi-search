export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sectionId, feedId } = req.query as { sectionId?: string; feedId?: string };

  if (!sectionId || !feedId) {
    return res.status(400).json({ error: 'sectionId and feedId are required' });
  }

  try {
    const response = await fetch(
      `https://recs-worker.use1.dynamicyield.com/api/v1/section/${sectionId}/feed/${feedId}/widgets`
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Widgets API error: ${response.statusText}`, details: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
