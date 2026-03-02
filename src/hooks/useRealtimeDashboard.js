import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocketClient } from '../services/socketClient';

function normalizeStudentsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.students)) return payload.students;
  return null;
}

function normalizeStatsPayload(payload) {
  if (!payload) return null;

  if (payload.lateCount !== undefined) {
    return {
      ...payload,
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };
  }

  if (payload.statistics) {
    return {
      ...payload.statistics,
      updatedAt: payload.statistics.updatedAt || new Date().toISOString(),
    };
  }

  return null;
}

export function useRealtimeDashboard(selectedSchoolId = '') {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState(
    import.meta.env.VITE_WS_URL ? 'connecting' : 'mock',
  );

  useEffect(() => {
    const socket = getSocketClient();

    if (!socket) {
      setConnectionStatus('mock');
      return;
    }

    function handleConnect() {
      setConnectionStatus('connected');
    }

    function handleDisconnect() {
      setConnectionStatus('disconnected');
    }

    function handleConnectError() {
      setConnectionStatus('error');
    }

    function handleStudentsUpdate(payload) {
      const students = normalizeStudentsPayload(payload);
      if (!students) return;
      queryClient.setQueryData(['students', selectedSchoolId || ''], students);
    }

    function handleStatsUpdate(payload) {
      const stats = normalizeStatsPayload(payload);
      if (!stats) return;
      queryClient.setQueryData(['attendance-stats'], stats);
    }

    function handleScanCheckin(payload) {
      if (!payload || typeof payload !== 'object') return;
      if (
        selectedSchoolId &&
        payload.idschool &&
        String(payload.idschool) !== String(selectedSchoolId)
      ) {
        return;
      }
      queryClient.setQueryData(['scan-latest'], payload);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    socket.on('students:update', handleStudentsUpdate);
    socket.on('attendance:update', handleStatsUpdate);
    socket.on('stats:update', handleStatsUpdate);
    socket.on('scan:checkin', handleScanCheckin);
    function handleDashboardUpdate(payload) {
      handleStudentsUpdate(payload);
      handleStatsUpdate(payload);
    }

    socket.on('dashboard:update', handleDashboardUpdate);

    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('students:update', handleStudentsUpdate);
      socket.off('attendance:update', handleStatsUpdate);
      socket.off('stats:update', handleStatsUpdate);
      socket.off('scan:checkin', handleScanCheckin);
      socket.off('dashboard:update', handleDashboardUpdate);
      socket.disconnect();
    };
  }, [queryClient, selectedSchoolId]);

  return { connectionStatus };
}
