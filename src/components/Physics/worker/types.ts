export type AtomicProps = {
  mass?: number;
  material?: {
    friction?: number;
    restitution?: number;
  }
  damping?: {
    linearDamping: number;
    angularDamping: number;
  }
  margin?: number;
};

export type BodyProps = AtomicProps & {
  args?: unknown;
  position?: THREE.Vector3 | [x: number, y: number, z: number];
  rotation?: THREE.Euler | [x: number, y: number, z: number, order?: number | undefined];
  type?: 'Dynamic' | 'Static' | 'Kinematic';
};

export type BoxProps = BodyProps & { args?: [x: number, y: number, z: number] };

export type SphereProps = BodyProps & {
  args?: number;
};

export type ShapeType =
  | 'Box'
  | 'Sphere';
