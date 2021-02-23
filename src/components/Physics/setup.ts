import type { Object3D } from 'three';
import React, { createContext } from 'react';

import { PhysicsEvent } from './worker/events';
import { AtomicProps } from './worker/types';

export type Buffers = { positions: Float32Array; quaternions: Float32Array };
export type Refs = { [uuid: string]: Object3D };
export type Subscriptions = {
  [id: number]: (value: AtomicProps[keyof AtomicProps] | number[]) => void;
}

export type ProviderContext = {
  worker: Worker;
  postMessage: (event: PhysicsEvent) => void;
  bodies: React.MutableRefObject<{ [uuid: string]: number }>;
  buffers: Buffers;
  refs: Refs;
  subscriptions: Subscriptions;
};

export const context = createContext<ProviderContext>({} as ProviderContext);
