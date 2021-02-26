import * as Types from './types';

export interface EngineEvent {
  type: string;
  props: unknown;
}

export interface InitializeEvent extends EngineEvent {
  type: 'init';
  props: {
    wasmPath: string;
    dynamics: Types.Dynamics;
    gravity: [number, number, number];
    broadphase: Types.SAPBroadphase | Types.NaiveBroadphase;
  }
}

export interface AddBodiesEvent extends EngineEvent {
  type: 'addBodies';
  props: {
    uuids: string[];
    type: Types.Shape;
    props: Types.BodyProps[];
  }
}

export interface RemoveBodiesEvent extends EngineEvent {
  type: 'removeBodies';
  props: {
    uuids: string[];
  }
}

export interface StepEvent extends EngineEvent {
  type: 'step';
  props: {
    positions: Float32Array;
    quaternions: Float32Array;
  }
}

export type ChangeEvent = {
  [P in keyof Types.SubscribableValues]: {
    type: `set${Capitalize<P>}`,
    props: {
      uuid: string;
      value: Types.SubscribableValues[P];
    }
  }
}[keyof Types.SubscribableValues];

export type ApplyEvent = {
  type: 'applyForce' | 'applyImpulse' | 'applyCentralLocalForce' | 'applyCentralImpulse';
  props: {
    uuid: string;
    value: [[x: number, y: number, z: number], [x: number, y: number, z: number]];
  }
};
export interface SubscribeEvent extends EngineEvent {
  type: 'subscribe';
  props: {
    name: keyof Types.SubscribableValues;
    id: number;
    uuid: string;
  }
}

export interface UnsubscribeEvent extends EngineEvent {
  type: 'unsubscribe';
  props: {
    name: keyof Types.SubscribableValues;
    id: number;
    uuid: string;
  }
}

type Events =
  | InitializeEvent
  | AddBodiesEvent
  | RemoveBodiesEvent
  | StepEvent
  | ChangeEvent
  | ApplyEvent
  | SubscribeEvent
  | UnsubscribeEvent;

export default Events;
