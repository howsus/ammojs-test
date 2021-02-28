import { useContext, useEffect, useMemo } from 'react';

import { context, Actions, Emmiter } from './setup';

interface EmmiterApi {
  on: Emmiter['on'];
  off: Emmiter['off'];
  emit: Emmiter['emit'];
}

export const useCommunicator = (): EmmiterApi => {
  const { emmiter } = useContext(context);

  const api = useMemo<EmmiterApi>(() => ({
    on: (...args) => emmiter.on(...args),
    off: (...args) => emmiter.off(...args),
    emit: (...args) => emmiter.emit(...args),
  }), [emmiter]);

  return api;
};

export const useListener = <T extends Actions['type']>(
  type: T,
  listener: (payload: Actions extends { type: T } ? Actions['payload'] : never) => void,
): void => {
  const { on } = useCommunicator();

  useEffect(() => on(type, listener), [type, listener]);
};
