import React from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import { Palette, Spacing, MaxContentWidth } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1, backgroundColor: Palette.paper }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="orders" href="/" asChild>
            <TabButton>📋 Live Orders</TabButton>
          </TabTrigger>
          <TabTrigger name="standee" href="/standee" asChild>
            <TabButton>📱 Counter Standee</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>⚙️ Store & WiFi</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export const TabButton = React.forwardRef<any, TabTriggerSlotProps>(
  ({ children, isFocused, ...props }, ref) => {
    return (
      <Pressable ref={ref} {...props} style={({ pressed }) => pressed && styles.pressed}>
        <View style={[styles.tabButtonView, isFocused && styles.tabButtonFocused]}>
          <Text style={[styles.tabButtonText, isFocused && styles.tabButtonTextFocused]}>
            {children}
          </Text>
        </View>
      </Pressable>
    );
  }
);

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge} />
          <Text style={styles.brandText}>Print2Me Vendor</Text>
        </View>
        <View style={styles.navRow}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 247, 242, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
  },
  innerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    shadowColor: '#0E1A3A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.success.DEFAULT,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  tabButtonFocused: {
    backgroundColor: Palette.saffron.tint,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.ink.soft,
  },
  tabButtonTextFocused: {
    color: Palette.saffron.DEFAULT,
    fontWeight: '800',
  },
});
