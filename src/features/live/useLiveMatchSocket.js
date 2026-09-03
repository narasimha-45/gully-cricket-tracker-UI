import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../../observability/logger";
import {
  buildLivePatch,
  buildPublicLiveSnapshot,
  createLiveWebSocketUrl,
  getScorerToken,
} from "./liveMatchTransport";

const OPEN = 1;
const MAX_RECONNECT_MS = 10_000;

export function useLiveMatchSocket({
  matchId,
  role,
  match,
  enabled,
  onRemoteSnapshot,
  onRemotePatch,
  onRemoteEnded,
}) {
  const socketRef = useRef(null);
  const matchRef = useRef(match);
  const previousSentMatchRef = useRef(null);
  const lastRevisionRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const endedRef = useRef(false);
  const callbacksRef = useRef({
    onRemoteSnapshot,
    onRemotePatch,
    onRemoteEnded,
  });
  const [connectionState, setConnectionState] = useState("idle");

  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    callbacksRef.current = {
      onRemoteSnapshot,
      onRemotePatch,
      onRemoteEnded,
    };
  }, [onRemoteEnded, onRemotePatch, onRemoteSnapshot]);

  const nextRevision = useCallback(() => {
    const next = Math.max(Date.now(), lastRevisionRef.current + 1);
    lastRevisionRef.current = next;
    return next;
  }, []);

  const send = useCallback((message) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const sendFullSync = useCallback(() => {
    if (role !== "SCORER") return false;
    const current = matchRef.current;
    const scorerToken = getScorerToken(current);
    if (!current || !scorerToken) return false;

    const sent = send({
      type: "SYNC",
      matchId,
      seasonId: current.seasonId,
      scorerToken,
      revision: nextRevision(),
      snapshot: buildPublicLiveSnapshot(current),
    });

    if (sent) previousSentMatchRef.current = current;
    return sent;
  }, [matchId, nextRevision, role, send]);

  useEffect(() => {
    if (!enabled || !matchId || !role) return undefined;
    let disposed = false;

    endedRef.current = false;

    const connect = () => {
      if (disposed || endedRef.current) return;
      clearTimeout(reconnectTimerRef.current);
      setConnectionState("connecting");

      const socket = new WebSocket(createLiveWebSocketUrl(matchId));
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        reconnectAttemptRef.current = 0;
        setConnectionState("connected");
        if (role === "SCORER") sendFullSync();
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const revision = Number(message.revision || 0);
          if (revision > lastRevisionRef.current) {
            lastRevisionRef.current = revision;
          }

          if (role === "SCORER" && message.type === "RESYNC_REQUIRED") {
            sendFullSync();
            return;
          }

          if (message.type === "ENDED") {
            if (role === "VIEWER" && message.snapshot) {
              callbacksRef.current.onRemoteSnapshot?.(
                message.snapshot,
                revision,
              );
              callbacksRef.current.onRemoteEnded?.(message);
            }
            endedRef.current = true;
            setConnectionState("ended");
            socket.onclose = null;
            socket.close();
            return;
          }

          if (message.type === "ERROR") {
            logger.warn("live.websocket.server.error", {
              matchId,
              message: message.message,
            });
            return;
          }

          if (role === "VIEWER") {
            if (message.type === "SNAPSHOT" && message.snapshot) {
              callbacksRef.current.onRemoteSnapshot?.(
                message.snapshot,
                revision,
              );
            } else if (message.type === "PATCH" && message.patch) {
              callbacksRef.current.onRemotePatch?.(message.patch, revision);
            }
          }
        } catch (error) {
          logger.warn("live.websocket.message.invalid", { matchId, error });
        }
      };

      socket.onerror = () => {
        if (!disposed) setConnectionState("reconnecting");
      };

      socket.onclose = () => {
        if (disposed || endedRef.current) return;
        setConnectionState("reconnecting");
        const attempt = reconnectAttemptRef.current + 1;
        reconnectAttemptRef.current = attempt;
        const delay = Math.min(1000 * 2 ** Math.min(attempt - 1, 3), MAX_RECONNECT_MS);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      socketRef.current = null;
      previousSentMatchRef.current = null;
      setConnectionState("idle");
    };
  }, [enabled, matchId, role, sendFullSync]);

  useEffect(() => {
    if (
      !enabled ||
      role !== "SCORER" ||
      !match ||
      socketRef.current?.readyState !== OPEN
    ) {
      return;
    }

    const previous = previousSentMatchRef.current;
    if (!previous) {
      sendFullSync();
      return;
    }
    if (previous === match) return;

    const scorerToken = getScorerToken(match);
    if (!scorerToken) return;

    const patch = buildLivePatch(previous, match);
    const sent = send({
      type: "PATCH",
      matchId,
      seasonId: match.seasonId,
      scorerToken,
      revision: nextRevision(),
      patch,
    });
    if (sent) previousSentMatchRef.current = match;
  }, [enabled, match, matchId, nextRevision, role, send, sendFullSync]);

  return { connectionState, sendFullSync };
}
