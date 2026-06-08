import { useQuery } from '@tanstack/react-query';
import { useConfig } from '../context/ConfigContext';
import { useRequestLog } from '../context/RequestLogContext';

export interface DYSearchResponse {
  totalNumResults: number;
  slots: Array<{
    item: any;
    strId: string | number;
    md: any;
    fallback: boolean;
  }>;
  facets: {
    [key: string]: Array<{
      value: string;
      count: number;
    }>;
  };
  spellCheckedQuery: string | null;
  translatedQuery: string | null;
  errorMessage: string | null;
}

export const useDYSearch = (query: string, offset: number, filters: any[] = []) => {
  const { config, setLastRequestPayload } = useConfig();
  const { loggedFetch } = useRequestLog();

  return useQuery({
    queryKey: ['dySearch', query, offset, filters, config.sectionId, config.feedId, config],
    queryFn: async (): Promise<DYSearchResponse> => {
      // If we don't have IDs, return early (though Query will be disabled)
      if (!config.sectionId || !config.feedId) {
        throw new Error('Section ID and Feed ID are required');
      }

      const fId = isNaN(Number(config.feedId)) ? config.feedId : Number(config.feedId);

      const isEu = config.sectionId?.startsWith('98');
      const region = isEu ? 'EU' : 'US';

      const clampWeight = (value: number) => Math.max(-100, Math.min(100, value));

      const dynamicPriorityFactors = config.useDynamicBoosting
        ? (config.dynamicBoostingFactors || [])
            .filter((factor) => factor.field?.trim() && factor.value?.trim())
            .map((factor, idx) => ({
              name: `filter_${idx}`,
              rule: {
                contextTrigger: null,
                name: `filter_${idx}`,
                productsFilter: {
                  items: [],
                  query: {
                    conditions: [
                      {
                        arguments: [
                          {
                            action: factor.matchType,
                            value: factor.value,
                          },
                        ],
                        field: factor.field,
                      },
                    ],
                  },
                  type: 'dynamic',
                },
              },
              weight: clampWeight(Number(factor.weight) || 0),
            }))
        : [];

      const affinityPriorityFactors = config.useAffinityBoosting
        ? [
            {
              name: 'USER_AFFINITIES_V2',
              weight: clampWeight(Number(config.affinityBoostWeight) || 0),
            },
          ]
        : [];

      let affinityProfile: Record<string, unknown> = {};
      if (config.useAffinityBoosting && config.affinityProfileJson.trim()) {
        try {
          const parsed = JSON.parse(config.affinityProfileJson);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            affinityProfile = parsed;
          }
        } catch (error) {
          console.warn('Invalid affinity profile JSON. Using empty affinity profile.');
        }
      }

      const priorityFactors = [...dynamicPriorityFactors, ...affinityPriorityFactors];

      // Build search object with optional parameters
      const searchObj: any = {
        text: query || "*",
        pagination: {
          numItems: config.itemsPerPage,
          offset: offset,
        },
        suggestMode: config.suggestMode,
        explain_mode: config.explainMode,
        translation_enabled: config.translationEnabled,
        plp_search_mode: config.plpSearchMode,
        image_boost: config.imageBoost,
        image_knn_threshold: config.imageKnnThreshold,
        text_knn_threshold: config.textKnnThreshold,
        k: config.k,
        num_candidates: config.numCandidates,
        ...(priorityFactors.length > 0 ? { priorityFactors } : {}),
        ...(Object.keys(affinityProfile).length > 0 ? { affinityProfile } : {}),
      };

      // Conditionally add optional parameters
      if (config.useSearchFormula && config.searchFormula) {
        searchObj.search_formula = config.searchFormula;
      }
      if (config.useBucketSize) {
        searchObj.bucket_size = config.bucketSize;
      }
      if (config.sortByEnabled) {
        searchObj.sortBy = { field: 'popularity' };
      }
      if (config.useLocale && config.locale) {
        searchObj.locale = config.locale;
      }

      const payload = {
        data: [
          {
            fId: fId,
            ...(config.widgetId ? { wId: String(config.widgetId) } : {}),
            maxProducts: config.maxProducts,
            rules: [],
            filtering: [],
            strategy: config.strategy,
            searchFilters: filters,
            search: searchObj,
          },
        ],
        ctx: { 
          lng: config.language, 
          type: config.ctxType 
        },
        geoLocation: {
          geoCode: config.geoCode,
          geoRegionCode: config.geoRegionCode
        },
        ...(config.uid ? { uid: config.uid } : {}),
      };

      // Create clean payload for display (without region/sectionId) 
      setLastRequestPayload(payload);

      // Include region and sectionId for the proxy endpoint to route correctly
      const requestPayload = {
        region,
        sectionId: config.sectionId,
        ...payload
      };

      const response = await loggedFetch('/api/dy-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DY API Error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      
      // LOG RAW RESPONSE FOR DEBUGGING (Required by user)
      console.log('DY Search Response Data:', json);

      if (!json.response || !Array.isArray(json.response) || json.response.length === 0) {
        console.error('DY API: Unexpected response structure', json);
        throw new Error('Invalid response format: Missing "response" array or empty response.');
      }

      // Extract totalNumResults from the first response object
      const totalResults = json.response?.[0]?.totalNumResults ?? 0;

      // Parse first response as main results
      const firstResponse = json.response[0];
      return {
        totalNumResults: totalResults,
        slots: firstResponse.slots || [],
        facets: firstResponse.facets || {},
        spellCheckedQuery: firstResponse.spellCheckedQuery || null,
        translatedQuery: firstResponse.translatedQuery || null,
        errorMessage: firstResponse.errorMessage || null
      };

      const result = json.response[0];

      if (!result.slots) {
        console.warn('DY API: No slots field in response[0]', result);
        return { ...result, slots: [] };
      }

      return result;
    },
    enabled: !!config.sectionId && !!config.feedId,
  });
};
