import React, { useMemo, useState } from 'react';

import EventEmmiter from '../../helpers/EventEmmiter';

import {
  context,
  Emmiter,
  ProviderContext,
} from './setup';

export type ProviderProps = {
  children: React.ReactNode;
};

const Provider: React.FC<ProviderProps> = ({
  children,
}: ProviderProps) => {
  const [emmiter] = useState<Emmiter>(() => new EventEmmiter());

  const api = useMemo(() => ({ emmiter }), [emmiter]);

  return (
    <context.Provider value={api as ProviderContext}>
      {children}
    </context.Provider>
  );
};

export default Provider;
