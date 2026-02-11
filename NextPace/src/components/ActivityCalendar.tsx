import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ActivityCalendarProps {
  activeDays: Set<number>;
  year: number;
  month: number;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const ActivityCalendar: React.FC<ActivityCalendarProps> = ({
  activeDays,
  year,
  month,
}) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDay = today.getDate();

  // Montar grid do calendário
  const cells: Array<{ day: number | null; active: boolean; isToday: boolean }> = [];

  // Dias vazios antes do primeiro dia
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, active: false, isToday: false });
  }

  // Dias do mês
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      active: activeDays.has(d),
      isToday: isCurrentMonth && d === currentDay,
    });
  }

  // Dividir em semanas
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const totalActive = activeDays.size;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthName}>{MONTH_NAMES[month]}</Text>
        <Text style={styles.count}>
          {totalActive} {totalActive === 1 ? 'dia' : 'dias'}
        </Text>
      </View>

      {/* Cabeçalho dos dias da semana */}
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.dayCell}>
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Semanas */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((cell, cellIndex) => (
            <View key={cellIndex} style={styles.dayCell}>
              {cell.day !== null ? (
                <View
                  style={[
                    styles.dot,
                    cell.active && styles.dotActive,
                    cell.isToday && styles.dotToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      cell.active && styles.dayTextActive,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
          {/* Preencher células faltantes na última semana */}
          {week.length < 7 &&
            Array.from({ length: 7 - week.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotToday: {
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
  },
  dayText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  dayTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
