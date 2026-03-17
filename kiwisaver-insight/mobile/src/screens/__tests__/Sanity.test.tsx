import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

describe('Simple Test', () => {
  it('renders text', () => {
    const { getByText } = render(
      <View>
        <Text>Hello World</Text>
      </View>
    );
    expect(getByText('Hello World')).toBeTruthy();
  });
});
