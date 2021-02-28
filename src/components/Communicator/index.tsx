import React from 'react';

import { context } from './setup';
import Provider, { ProviderProps } from './Provider';

const CommunicatorProvider: React.FC<ProviderProps> = (props: ProviderProps) => (
  <Provider {...props} />
);

export { context };

export * from './hooks';

export default CommunicatorProvider;
