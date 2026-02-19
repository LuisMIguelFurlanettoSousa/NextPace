/**
 * Formata segundos em formato legível:
 * - Só segundos: "30s"
 * - Com minutos: "1:30" (1 min 30 seg)
 * - Com horas: "1:05:30" (1h 5min 30seg)
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  if (mins > 0) {
    if (secs > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}min`;
  }
  return `${secs}s`;
};
