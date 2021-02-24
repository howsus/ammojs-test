import {
  ShapeType,
  BodyProps,
} from './types';

export interface InitialEvent {
  operation: 'init';
  props: {
    dynamics?: 'SoftRigid' | 'Discrete';
    gravity?: [number, number, number];
  }
}

export interface StepEvent {
  operation: 'step';
  positions: Float32Array;
  quaternions: Float32Array;
}

export interface AddBodiesEvent {
  operation: 'addBodies';
  uuid: string[];
  type: ShapeType;
  props: BodyProps[];
}

export interface RemoveBodiesEvent {
  operation: 'removeBodies';
  uuid: string[];
}

export interface VectorModifierEvent {
  operation:
    | 'setPosition'
    | 'setQuaternion'
    | 'setLinearVelocity'
    | 'setAngularVelocity'
    | 'setLinearFactor'
    | 'setAngularFactor';
  uuid: string;
  props: [number, number, number];
}

export interface SubscribeEvent {
  operation: 'subscribe';
  uuid: string;
  props: {
    id: number;
    type: string;
  }
}

export interface UnsubscribeEvent {
  operation: 'unsubscribe';
  uuid: string;
  props: number;
}

export type PhysicsEvent =
  | InitialEvent
  | StepEvent
  | AddBodiesEvent
  | RemoveBodiesEvent
  | SubscribeEvent
  | UnsubscribeEvent
  | VectorModifierEvent;
