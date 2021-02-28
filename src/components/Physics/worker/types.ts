import { CollisionEvent } from '../setup';

export type Dynamics = 'Discrete' | 'Soft';

export type Gravity = [x: number, y: number, z: number];

export type BodyType = 'Dynamic' | 'Static' | 'Kinematic';

export type MaterialType = 'Rigid' | 'Soft';

export type SAPBroadphase = {
  type: 'SAP';
  aabbmin: [x: number, y: number, z: number];
  aabbmax: [x: number, y: number, z: number];
}

export type NaiveBroadphase = {
  type: 'Naive';
}

export type Shape =
  | 'Box'
  | 'Sphere'
  | 'Plane'
  | 'Cylinder';

export type AtomicProps = {
  mass?: number;
  friction?: number;
  restitution?: number;
  rollingFriction?: number;
  linearDamping?: number;
  angularDamping?: number;
  collisionFilterGroup?: number;
  collisionFilterMask?: number;
  margin?: number;
};

export type BodyProps = AtomicProps & {
  args: unknown;
  position?: [x: number, y: number, z: number];
  rotation?: [x: number, y: number, z: number, w: number];
  linearVelocity?: [x: number, y: number, z: number];
  angularVelocity?: [x: number, y: number, z: number];
  linearFactor?: [x: number, y: number, z: number];
  angularFactor?: [x: number, y: number, z: number];
  type: BodyType;
  onCollide?: (e: CollisionEvent) => void;
}

export type BoxProps = BodyProps & { args?: [x: number, y: number, z: number] };

export type PlaneProps = BodyProps & { args?: [x: number, y: number, z: number] };

export type CylinderProps = BodyProps & { args?: [radius: number, height: number, radius: number] };

export type SphereProps = BodyProps & {
  args?: number;
};

export type SubscribableValues = Required<Pick<BodyProps,
  | 'angularDamping'
  | 'angularFactor'
  | 'angularVelocity'
  | 'friction'
  | 'linearDamping'
  | 'linearFactor'
  | 'linearVelocity'
  | 'rotation'
  | 'margin'
  | 'position'
  | 'restitution'
  | 'rollingFriction'>>;
