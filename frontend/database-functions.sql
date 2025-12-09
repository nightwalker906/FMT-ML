-- ============================================================================
-- DATABASE FUNCTIONS FOR MESSAGING SYSTEM
-- ============================================================================
-- Run these SQL commands in Supabase SQL Editor to create helper functions
-- ============================================================================

-- Get conversations for a user with the latest message
CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversation_partners AS (
    SELECT DISTINCT
      CASE 
        WHEN m.sender_id = user_id THEN m.receiver_id
        ELSE m.sender_id
      END AS partner_id
    FROM messages m
    WHERE m.sender_id = user_id OR m.receiver_id = user_id
  ),
  latest_messages AS (
    SELECT
      cp.partner_id,
      m.content,
      m.created_at,
      ROW_NUMBER() OVER (PARTITION BY cp.partner_id ORDER BY m.created_at DESC) AS rn
    FROM conversation_partners cp
    JOIN messages m ON 
      (m.sender_id = user_id AND m.receiver_id = cp.partner_id) OR
      (m.sender_id = cp.partner_id AND m.receiver_id = user_id)
  ),
  unread_messages AS (
    SELECT
      sender_id,
      COUNT(*) AS unread_count
    FROM messages
    WHERE receiver_id = user_id AND is_read = false
    GROUP BY sender_id
  )
  SELECT
    cp.partner_id,
    cp.partner_id,
    COALESCE(p.first_name || ' ' || p.last_name, u.email) AS user_name,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS user_avatar,
    lm.content,
    lm.created_at,
    COALESCE(um.unread_count, 0)
  FROM conversation_partners cp
  LEFT JOIN latest_messages lm ON cp.partner_id = lm.partner_id AND lm.rn = 1
  LEFT JOIN profiles p ON p.id = cp.partner_id
  LEFT JOIN auth.users u ON u.id = cp.partner_id
  LEFT JOIN unread_messages um ON um.sender_id = cp.partner_id
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant permissions to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID) TO authenticated;
