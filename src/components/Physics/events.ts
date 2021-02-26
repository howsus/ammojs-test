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

export type WorkerEvent =
  | FrameEvent;

export default WorkerEvent;
