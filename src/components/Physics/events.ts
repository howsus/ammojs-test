import { SubscribableValues } from './worker/types';

export interface FrameEvent {
  type: 'frame';
  props: {
    observations: [number, SubscribableValues[keyof SubscribableValues]][];
    positions: Float32Array;
    quaternions: Float32Array;
    active: boolean;
    bodies?: string[];
  }
}

export interface CollisionEvent {
  type: 'collision';
  props: {
    target: string;
    body: string;
    distance: number;
    contact: {
      // ni: number[];
      // ri: number[];
      // rj: number[];
      impactVelocity: number;
    };
    collisionFilters: {
      bodyFilterGroup: number;
      bodyFilterMask: number;
      targetFilterGroup: number;
      targetFilterMask: number;
    };
  };
}

export type WorkerEvent =
  | FrameEvent
  | CollisionEvent;

export default WorkerEvent;
