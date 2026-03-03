import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  Vibration,
  GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface DraggableListProps<T> {
  data: T[];
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onReorder: (data: T[]) => void;
  onItemTap?: (item: T, index: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  contentContainerStyle?: ViewStyle;
  longPressDuration?: number;
}

export function DraggableList<T>({
  data,
  renderItem,
  keyExtractor,
  onReorder,
  onItemTap,
  onDragStart,
  onDragEnd,
  contentContainerStyle,
  longPressDuration = 300,
}: DraggableListProps<T>) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [itemHeights, setItemHeights] = useState<number[]>([]);

  const draggingIndexRef = useRef<number | null>(null);
  const dragYRef = useRef(0);
  const itemHeightsRef = useRef<number[]>([]);
  const dataRef = useRef(data);

  dataRef.current = data;
  itemHeightsRef.current = itemHeights;

  const handleLayout = (index: number, height: number) => {
    setItemHeights((prev) => {
      const newHeights = [...prev];
      newHeights[index] = height;
      return newHeights;
    });
  };

  const getTargetIndex = (fromIndex: number, dy: number): number => {
    const heights = itemHeightsRef.current;
    const itemHeight = heights[fromIndex] || 80;
    const positions = Math.round(dy / itemHeight);
    const newIndex = fromIndex + positions;
    return Math.max(0, Math.min(dataRef.current.length - 1, newIndex));
  };

  const handleDragStart = async (index: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      Vibration.vibrate();
    }

    draggingIndexRef.current = index;
    dragYRef.current = 0;
    setDraggingIndex(index);
    setDragY(0);
    onDragStart?.();
  };

  const handleDragMove = (dy: number) => {
    dragYRef.current = dy;
    setDragY(dy);
  };

  const handleDragEnd = () => {
    const fromIndex = draggingIndexRef.current;
    if (fromIndex === null) return;

    const toIndex = getTargetIndex(fromIndex, dragYRef.current);

    if (toIndex !== fromIndex) {
      const newData = [...dataRef.current];
      const [removed] = newData.splice(fromIndex, 1);
      newData.splice(toIndex, 0, removed);
      onReorder(newData);
    }

    draggingIndexRef.current = null;
    dragYRef.current = 0;
    setDraggingIndex(null);
    setDragY(0);
    onDragEnd?.();
  };

  const handleTap = (item: T, index: number) => {
    onItemTap?.(item, index);
  };

  const getItemStyle = (index: number) => {
    if (draggingIndex === null) {
      return { transform: [{ translateY: 0 }], zIndex: 1 };
    }

    if (index === draggingIndex) {
      return {
        transform: [{ translateY: dragY }],
        zIndex: 999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      };
    }

    const targetIndex = getTargetIndex(draggingIndex, dragY);
    const itemHeight = itemHeights[draggingIndex] || 80;

    let offset = 0;
    if (draggingIndex < targetIndex) {
      if (index > draggingIndex && index <= targetIndex) {
        offset = -itemHeight;
      }
    } else if (draggingIndex > targetIndex) {
      if (index >= targetIndex && index < draggingIndex) {
        offset = itemHeight;
      }
    }

    return { transform: [{ translateY: offset }], zIndex: 1 };
  };

  return (
    <View style={contentContainerStyle}>
      {data.map((item, index) => (
        <DraggableItem
          key={keyExtractor(item)}
          item={item}
          index={index}
          style={getItemStyle(index)}
          renderItem={renderItem}
          isDragging={draggingIndex === index}
          onLayout={handleLayout}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onTap={handleTap}
          longPressDuration={longPressDuration}
        />
      ))}
    </View>
  );
}

interface DraggableItemProps<T> {
  item: T;
  index: number;
  style: object;
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  isDragging: boolean;
  onLayout: (index: number, height: number) => void;
  onDragStart: (index: number) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
  onTap: (item: T, index: number) => void;
  longPressDuration: number;
}

function DraggableItem<T>({
  item,
  index,
  style,
  renderItem,
  isDragging,
  onLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTap,
  longPressDuration,
}: DraggableItemProps<T>) {
  const indexRef = useRef(index);
  const itemRef = useRef(item);
  indexRef.current = index;
  itemRef.current = item;

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isActivated = useRef(false);
  const startTime = useRef(0);
  const startPageY = useRef(0);
  const hasMoved = useRef(false);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    onLayout(indexRef.current, height);
  };

  // --- Eventos nativos de toque: long press e tap ---
  // Não bloqueiam o ScrollView
  const handleTouchStart = (e: GestureResponderEvent) => {
    hasMoved.current = false;
    isActivated.current = false;
    startTime.current = Date.now();
    startPageY.current = e.nativeEvent.pageY;

    longPressTimer.current = setTimeout(() => {
      isActivated.current = true;
      onDragStart(indexRef.current);
    }, longPressDuration);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    const dy = Math.abs(e.nativeEvent.pageY - startPageY.current);
    if (dy > 10) {
      hasMoved.current = true;
      clearTimer();
    }
  };

  const handleTouchEnd = () => {
    clearTimer();

    // Se estava arrastando, o onResponderRelease cuida
    if (isActivated.current) return;

    const pressDuration = Date.now() - startTime.current;
    if (!hasMoved.current && pressDuration < longPressDuration) {
      onTap(itemRef.current, indexRef.current);
    }
  };

  const handleTouchCancel = () => {
    clearTimer();
    hasMoved.current = true;
  };

  // --- Responder system: rastreia o drag após long press ---
  // onMoveShouldSetResponder só retorna true quando isActivated = true
  // Isso permite o ScrollView funcionar normalmente até o long press ativar

  return (
    <View
      style={[styles.itemContainer, style]}
      onLayout={handleLayout}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => isActivated.current}
      onMoveShouldSetResponderCapture={() => isActivated.current}
      onResponderTerminationRequest={() => !isActivated.current}
      onResponderMove={(e) => {
        if (isActivated.current) {
          const dy = e.nativeEvent.pageY - startPageY.current;
          onDragMove(dy);
        }
      }}
      onResponderRelease={() => {
        if (isActivated.current) {
          onDragEnd();
          isActivated.current = false;
        }
      }}
      onResponderTerminate={() => {
        clearTimer();
        if (isActivated.current) {
          onDragEnd();
          isActivated.current = false;
        }
      }}
    >
      {renderItem(item, index, isDragging)}
    </View>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    position: 'relative',
  },
});
