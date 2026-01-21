import React, { useRef, useState } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
  Vibration,
  Platform,
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

  // Keep refs in sync
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
    // Trigger haptic feedback
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

  // Calculate visual positions based on drag state
  const getItemStyle = (index: number) => {
    if (draggingIndex === null) {
      return { transform: [{ translateY: 0 }], zIndex: 1 };
    }

    if (index === draggingIndex) {
      // Dragged item follows finger
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

    // Calculate target position
    const targetIndex = getTargetIndex(draggingIndex, dragY);
    const itemHeight = itemHeights[draggingIndex] || 80;

    let offset = 0;
    if (draggingIndex < targetIndex) {
      // Dragging down: items between dragging and target move up
      if (index > draggingIndex && index <= targetIndex) {
        offset = -itemHeight;
      }
    } else if (draggingIndex > targetIndex) {
      // Dragging up: items between target and dragging move down
      if (index >= targetIndex && index < draggingIndex) {
        offset = itemHeight;
      }
    }

    return { transform: [{ translateY: offset }], zIndex: 1 };
  };

  return (
    <View style={[styles.container, contentContainerStyle]}>
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
  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => isActivated.current,
      onMoveShouldSetPanResponderCapture: () => isActivated.current,

      onPanResponderGrant: () => {
        isActivated.current = false;
        hasMoved.current = false;
        startTime.current = Date.now();

        longPressTimer.current = setTimeout(() => {
          isActivated.current = true;
          onDragStart(indexRef.current);
        }, longPressDuration);
      },

      onPanResponderMove: (_, gestureState) => {
        if (!isActivated.current) {
          if (Math.abs(gestureState.dy) > 8 || Math.abs(gestureState.dx) > 8) {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            hasMoved.current = true;
          }
          return;
        }
        onDragMove(gestureState.dy);
      },

      onPanResponderRelease: (_, gestureState) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        const pressDuration = Date.now() - startTime.current;

        if (!isActivated.current) {
          if (!hasMoved.current && pressDuration < longPressDuration) {
            onTap(itemRef.current, indexRef.current);
          }
          return;
        }

        onDragEnd();
        isActivated.current = false;
      },

      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        if (isActivated.current) {
          onDragEnd();
        }
        isActivated.current = false;
      },
    })
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    onLayout(indexRef.current, height);
  };

  return (
    <View
      style={[styles.itemContainer, style]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {renderItem(item, index, isDragging)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemContainer: {
    position: 'relative',
  },
});
