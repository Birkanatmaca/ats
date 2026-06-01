import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/colors";
import { platformShadow } from "@/shared/ui/platformShadow";

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerAccessory?: ReactNode;
  sheetStyle?: ViewStyle;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  headerAccessory,
  sheetStyle
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const translateY = useSharedValue(windowHeight);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withSpring(0, { damping: 24, stiffness: 240, mass: 0.9 });
      backdrop.value = withTiming(1, { duration: 240 });
      return;
    }

    if (mounted) {
      translateY.value = withTiming(windowHeight, { duration: 220 });
      backdrop.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, windowHeight, translateY, backdrop]);

  function dismissSheet() {
    translateY.value = withTiming(windowHeight, { duration: 220 });
    backdrop.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(setMounted)(false);
        runOnJS(onClose)();
      }
    });
  }

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdrop.value = interpolate(event.translationY, [0, 280], [1, 0.35], Extrapolation.CLAMP);
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(dismissSheet)();
        return;
      }
      translateY.value = withSpring(0, { damping: 24, stiffness: 240 });
      backdrop.value = withTiming(1, { duration: 180 });
    });

  const sheetStyleAnimated = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value
  }));

  if (!mounted) return null;

  return (
    <Modal animationType="none" transparent visible={mounted} onRequestClose={dismissSheet} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.container}>
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable accessibilityLabel="Kapat" onPress={dismissSheet} style={StyleSheet.absoluteFill} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              platformShadow("0 -18px 48px rgba(28,53,87,0.18)", {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.14,
                shadowRadius: 24,
                elevation: 24
              }),
              { maxHeight: windowHeight * 0.92, paddingBottom: Math.max(insets.bottom, 16) },
              sheetStyleAnimated,
              sheetStyle
            ]}
          >
            <GestureDetector gesture={pan}>
              <View>
                <View style={styles.handleZone}>
                  <View style={styles.handle} />
                </View>

                {title || subtitle || headerAccessory ? (
                  <View style={styles.header}>
                    <View style={styles.headerCopy}>
                      {title ? (
                        <Text numberOfLines={2} style={styles.title}>
                          {title}
                        </Text>
                      ) : null}
                      {subtitle ? (
                        <Text numberOfLines={2} style={styles.subtitle}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {headerAccessory}
                  </View>
                ) : null}
              </View>
            </GestureDetector>

            <View style={styles.content}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  container: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.52)"
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden"
  },
  handleZone: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d5dee8"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12
  },
  headerCopy: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
    lineHeight: 18
  },
  content: {
    flexShrink: 1
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface
  }
});
