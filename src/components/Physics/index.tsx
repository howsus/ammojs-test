import React, { Suspense } from 'react';

import { context } from './setup';
import Provider, { ProviderProps } from './Provider';

const Physics: React.FC<ProviderProps> = (props: ProviderProps) => (
  <Suspense fallback={null}>
    <Provider {...props} />
  </Suspense>
);

export { context };

export * from './hooks';

export default Physics;
