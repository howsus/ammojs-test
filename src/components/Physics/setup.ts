import type { Object3D } from 'three';
import React, { createContext } from 'react';

import WorkerEvent from './worker/events';
import { SubscribableValues } from './worker/types';

export type Buffers = { positions: Float32Array; quaternions: Float32Array };
export type Refs = { [uuid: string]: Object3D };
export type Subscriptions = Record<number, (
  value: SubscribableValues[keyof SubscribableValues],
) => void>;

export type ProviderContext = {
  worker: Worker;
  postMessage: (event: WorkerEvent) => void;
  bodies: React.MutableRefObject<{ [uuid: string]: number }>;
  buffers: Buffers;
  refs: Refs;
  subscriptions: Subscriptions;
};

export const context = createContext<ProviderContext>({} as ProviderContext);
