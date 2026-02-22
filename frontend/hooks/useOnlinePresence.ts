'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

/**
 * useOnlinePresence — Tracks user presence automatically.
 *
 * ▸ On mount / window focus / online event → sets is_online = true, last_seen = now
 * ▸ Every HEARTBEAT_INTERVAL ms          → updates last_seen (keeps it fresh)
 * ▸ On tab hidden / offline / beforeunload → sets is_online = false, last_seen = now
 *
 * Works across tabs — every tab heartbeats so the user stays "online" as long
 * as any tab is open.  When the last tab closes the beforeunload handler fires.
 */

const HEARTBEAT_INTERVAL = 60_000 // 60 seconds

export function useOnlinePresence(userId: string | undefined) {
  const supabase = createClient()
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSettingOffline = useRef(false)

  // ── Go Online ────────────────────────────────────────────────────────────
  const goOnline = useCallback(async () => {
    if (!userId) return
    isSettingOffline.current = false
    try {
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', userId)
    } catch (err) {
      console.error('[Presence] goOnline error:', err)
    }
  }, [userId, supabase])

  // ── Go Offline ───────────────────────────────────────────────────────────
  const goOffline = useCallback(async () => {
    if (!userId || isSettingOffline.current) return
    isSettingOffline.current = true
    try {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', userId)
    } catch (err) {
      console.error('[Presence] goOffline error:', err)
    }
  }, [userId, supabase])

  // ── Synchronous offline (for beforeunload — must use sendBeacon) ────────
  const goOfflineSync = useCallback(() => {
    if (!userId) return
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`
    const body = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
    // sendBeacon is the only reliable way to send data on page unload
    navigator.sendBeacon?.(
      url,
      new Blob([body], { type: 'application/json' })
    )
    // sendBeacon alone lacks auth headers — also fire a fetch with keepalive
    try {
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
          'Prefer': 'return=minimal',
        },
        body,
        keepalive: true,
      })
    } catch {
      // best-effort
    }
  }, [userId])

  // ── Heartbeat ────────────────────────────────────────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(() => {
      if (!userId) return
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId)
        .then()
    }, HEARTBEAT_INTERVAL)
  }, [userId, supabase])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    // 1. Mark online immediately
    goOnline()
    startHeartbeat()

    // 2. Visibility change (tab switch)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        goOnline()
        startHeartbeat()
      } else {
        // Tab hidden — update last_seen but stay "online"
        // (user may have multiple tabs)
        supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId)
          .then()
      }
    }

    // 3. Online / offline network events
    const handleOnline = () => {
      goOnline()
      startHeartbeat()
    }
    const handleOffline = () => {
      stopHeartbeat()
      goOffline()
    }

    // 4. Before unload (tab / browser close)
    const handleBeforeUnload = () => {
      stopHeartbeat()
      goOfflineSync()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      stopHeartbeat()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Clean up — mark offline when component unmounts (e.g. logout)
      goOffline()
    }
  }, [userId, goOnline, goOffline, goOfflineSync, startHeartbeat, stopHeartbeat, supabase])

  return { goOffline }
}
