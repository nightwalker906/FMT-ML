import { API_BASE } from '@/lib/api-config';

type RecommenderEntity = 'student' | 'tutor';
type RecommenderSyncType = 'student_preferences' | 'tutor_corpus' | 'tutor_metadata';

interface RecommenderSyncPayload {
  entity: RecommenderEntity;
  syncType: RecommenderSyncType;
  profileId?: string;
}

export async function syncRecommender(payload: RecommenderSyncPayload): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/recommend/sync/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity: payload.entity,
        sync_type: payload.syncType,
        profile_id: payload.profileId,
      }),
    });

    if (!response.ok) {
      console.error('[recommender-sync] Sync request failed:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('[recommender-sync] Sync request error:', error);
    return false;
  }
}
