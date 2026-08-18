/**
 * Standard Search API Proxy Handler
 * Handles POST requests to /api/standard-search
 * Forwards requests to the DY Experience API (dy-api.com) Semantic Search endpoint
 * using the `dy-api-key` header, mirroring the Visual Search implementation.
 * Docs: https://dy.dev/reference/search
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    apiKey: clientApiKey,
    sectionId,
    text,
    numItems,
    offset,
    pageType,
    location,
    pageData,
    filters,
    sortBy,
    activeConsentAccepted,
  } = req.body ?? {};

  const apiKey = clientApiKey || process.env.EXPERIENCE_API_KEY || process.env.STANDARDSEARCH_API_KEY;
  if (!apiKey) {
    console.error('[Standard Search] API key not configured');
    return res.status(500).json({ error: 'Standard Search API key not configured' });
  }

  const isEu = typeof sectionId === 'string' && sectionId.startsWith('98');
  const dyApiBase = isEu ? 'https://dy-api.eu' : 'https://dy-api.com';

  const query: Record<string, any> = {
    pagination: {
      numItems: typeof numItems === 'number' ? numItems : 25,
      offset: typeof offset === 'number' ? offset : 0,
    },
    text: text && String(text).trim() ? String(text) : '*',
  };

  if (Array.isArray(filters) && filters.length > 0) {
    query.filters = filters;
  }
  if (sortBy && sortBy.field && sortBy.order) {
    query.sortBy = { field: sortBy.field, order: sortBy.order };
  }

  const payload = {
    user: {
      active_consent_accepted: activeConsentAccepted === true,
    },
    query,
    context: {
      page: {
        type: typeof pageType === 'string' && pageType ? pageType : 'HOMEPAGE',
        location: typeof location === 'string' && location ? location : 'https://www.mypage.com',
        ...(Array.isArray(pageData) && pageData.length > 0 ? { data: pageData } : {}),
      },
    },
    selector: {
      name: 'Semantic Search',
    },
    options: {
      returnAnalyticsMetadata: false,
      isImplicitClientData: false,
    },
  };

  const upstreamUrl = `${dyApiBase}/v2/serve/user/search`;

  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'dy-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const upstreamHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => { upstreamHeaders[key] = value; });

    const text0 = await response.text();
    let data: any;
    try { data = JSON.parse(text0); } catch { data = { error: text0 }; }

    const upstream = {
      url: upstreamUrl,
      requestBody: payload,
      status: response.status,
      statusText: response.statusText,
      headers: upstreamHeaders,
    };

    if (!response.ok) {
      console.error('[Standard Search] API Error:', response.status, text0);
      return res.status(response.status).json({
        error: `Standard Search API error: ${response.statusText}`,
        details: data,
        _upstream: upstream,
      });
    }

    // Normalize the choices/variations response into the { response: [...] } shape
    // used by the rest of the app (extractDyPayload / useDYSearch.parseResponse).
    const searchData = extractSearchData(data);
    const normalized = {
      response: [
        {
          totalNumResults: searchData?.totalNumResults ?? 0,
          slots: normalizeSlots(searchData?.slots ?? []),
          facets: searchData?.facets ?? [],
          spellCheckedQuery: searchData?.spellCheckedQuery ?? null,
          normalizedQuery: searchData?.normalizedQuery ?? null,
        },
      ],
      _upstream: upstream,
    };

    return res.status(200).json(normalized);
  } catch (error) {
    console.error('[Standard Search] Proxy Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Pull the payload.data object out of the first search decision variation.
 */
function extractSearchData(response: any): any {
  try {
    if (Array.isArray(response?.choices)) {
      for (const choice of response.choices) {
        const variations = Array.isArray(choice?.variations) ? choice.variations : [];
        for (const variation of variations) {
          const payloadData = variation?.payload?.data;
          if (payloadData && typeof payloadData === 'object') {
            return payloadData;
          }
        }
      }
    }

    // Fallback: some responses already expose response[0]
    if (Array.isArray(response?.response) && response.response[0]) {
      return response.response[0];
    }
  } catch (error) {
    console.error('[Standard Search] Error extracting search data:', error);
  }
  return null;
}

/**
 * Map DY slots into the { item, sku, slotId } shape expected by the UI adapter.
 */
function normalizeSlots(slots: any[]): any[] {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => {
    if (slot && slot.item) {
      return slot;
    }
    if (slot && slot.productData) {
      return {
        item: { ...slot.productData, sku: slot.sku ?? slot.productData.sku },
        sku: slot.sku ?? slot.productData.sku,
        slotId: slot.slotId,
      };
    }
    return { item: slot, sku: slot?.sku, slotId: slot?.slotId };
  });
}
