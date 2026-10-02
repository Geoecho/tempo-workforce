import React, { Children, useState } from 'react';
import { Platform, View } from 'react-native';

/** Size columns from their actual available space, including the sidebar. */
export function ContentGrid({ children, minItemWidth = 380, maxColumns = 2, gap = 20 }: { children: React.ReactNode; minItemWidth?: number; maxColumns?: number; gap?: number }) {
  const [width, setWidth] = useState(0);
  const columns = Platform.OS === 'web' && width > 0 ? Math.max(1, Math.min(maxColumns, Math.floor((width + gap) / (minItemWidth + gap)))) : 1;
  const itemWidth = width > 0 ? Math.max(0, (width - gap * (columns - 1)) / columns) : undefined;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' }}>
    {Children.toArray(children).map((child, index) => <View key={React.isValidElement(child) ? child.key ?? index : index} style={{ width: itemWidth ?? '100%', minWidth: 0 }}>{child}</View>)}
  </View>;
}
