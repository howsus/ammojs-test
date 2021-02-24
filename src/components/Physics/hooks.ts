import { useFrame } from 'react-three-fiber';
import { Object3D, InstancedMesh, DynamicDrawUsage } from 'three';
import React, {
  useRef, useContext, useLayoutEffect, useMemo,
} from 'react';

import { Buffers, context } from './setup';

import {
  AtomicProps,
  ShapeType,
  BodyProps,
  BoxProps,
  SphereProps,
} from './worker/types';

export type BodyFn = (index: number) => BodyProps
export type BoxFn = (index: number) => BoxProps;
export type SphereFn = (index: number) => SphereProps;

type ArgFn = (props: unknown) => unknown;

type WorkerVec = {
  set: (x: number, y: number, z: number) => void
  copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) => void
  subscribe: (callback: (value: number[]) => void) => void
}

export type WorkerProps<T> = {
  [K in keyof T]: {
    set: (value: T[K]) => void
    subscribe: (callback: (value: T[K]) => void) => () => void
  }
}
export type WorkerApi = WorkerProps<AtomicProps> & {
  position: WorkerVec
  rotation: WorkerVec
  linearVelocity: WorkerVec
  angularVelocity: WorkerVec
  linearFactor: WorkerVec
  angularFactor: WorkerVec
  // applyForce: (force: number[], worldPoint: number[]) => void
  // applyImpulse: (impulse: number[], worldPoint: number[]) => void
  // applyLocalForce: (force: number[], localPoint: number[]) => void
  // applyLocalImpulse: (impulse: number[], localPoint: number[]) => void
}

type PublicApi = WorkerApi & { at: (index: number) => WorkerApi }

export type Api = [React.MutableRefObject<THREE.Object3D | undefined>, PublicApi];

const temp = new Object3D();

function prepare(object: Object3D, props: BodyProps, argFn: ArgFn) {
  object.position.set(...((props.position || [0, 0, 0]) as [number, number, number]));
  object.rotation.set(...((props.rotation || [0, 0, 0]) as [number, number, number]));
  return { ...props, args: argFn(props.args) };
}

function apply(object: THREE.Object3D, index: number, buffers: Buffers) {
  if (index !== undefined) {
    object.position.fromArray(buffers.positions, index * 3);
    object.quaternion.fromArray(buffers.quaternions, index * 4);
  }
}

let subscriptionGuid = 0;

export const useBody = (
  type: ShapeType,
  fn: BodyFn,
  argFn: ArgFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
): Api => {
  const localRef = useRef<THREE.Object3D>((null as unknown) as THREE.Object3D);
  const ref = fwdRef || localRef;
  const {
    postMessage, bodies, buffers, refs, subscriptions,
  } = useContext(context);

  useLayoutEffect(() => {
    if (!ref.current) {
      ref.current = new Object3D();
    }

    const object = ref.current;

    let uuid = [object.uuid];
    let props: BodyProps[];

    if (object instanceof InstancedMesh) {
      object.instanceMatrix.setUsage(DynamicDrawUsage);
      uuid = new Array(object.count).fill(0).map((_, i) => `${object.uuid}/${i}`);

      props = uuid.map((id, i) => {
        const preparedProps = prepare(temp, fn(i), argFn);
        temp.updateMatrix();
        object.setMatrixAt(i, temp.matrix);
        object.instanceMatrix.needsUpdate = true;
        return preparedProps;
      });
    } else {
      props = [prepare(object, fn(0), argFn)];
    }

    props.forEach((_, index) => {
      refs[uuid[index]] = object;
    });

    postMessage({
      operation: 'addBodies',
      type,
      uuid,
      props,
    });

    return () => {
      props.forEach((_, index) => {
        delete refs[uuid[index]];
        postMessage({ operation: 'removeBodies', uuid });
      });
    };
  }, []);

  useFrame(() => {
    if (ref.current && buffers.positions.length && buffers.quaternions.length) {
      if (ref.current instanceof InstancedMesh) {
        for (let i = 0; i < ref.current.count; i += 1) {
          const index = bodies.current[`${ref.current.uuid}/${i}`];
          if (index !== undefined) {
            apply(temp, index, buffers);
            temp.updateMatrix();
            ref.current.setMatrixAt(i, temp.matrix);
          }
          ref.current.instanceMatrix.needsUpdate = true;
        }
      } else {
        apply(ref.current, bodies.current[ref.current.uuid], buffers);
      }
    }
  });

  const api = useMemo(() => {
    const getUUID = (index?: number) => (index ? `${ref.current.uuid}/${index}` : ref.current.uuid);
    const post = (operation: any, index?: number, props?: any) => ref.current && postMessage({
      operation,
      uuid: getUUID(index),
      props,
    });
    const subscribe = (name: string, index?: number) => (
      callback: (value: any) => void,
    ) => {
      subscriptionGuid += 1;
      const id = subscriptionGuid;
      subscriptions[id] = callback;
      post('subscribe', index, { id, type: name });
      return () => {
        delete subscriptions[id];
        post('unsubscribe', index, id);
      };
    };
    const opString = (action: string, name: string) => {
      const asfsafgdsf = (
        action + name.charAt(0).toUpperCase() + name.slice(1)
      );

      console.log(asfsafgdsf);
      return asfsafgdsf;
    };
    const makeVec = (name: string, index?: number) => ({
      set: (x: number, y: number, z: number) => post(opString('set', name), index, [x, y, z]),
      copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) => post(opString('set', name), index, [x, y, z]),
      subscribe: subscribe(name, index),
    });

    const createApi = (index?: number): WorkerApi => ({
      position: makeVec('position', index),
      rotation: makeVec('quaternion', index),
      linearVelocity: makeVec('linearVelocity', index),
      angularVelocity: makeVec('angularVelocity', index),
      linearFactor: makeVec('linearFactor', index),
      angularFactor: makeVec('angularFactor', index),
    });

    const cache: { [index: number]: WorkerApi } = {};

    return {
      ...createApi(undefined),
      at: (index: number) => {
        if (cache[index]) {
          return cache[index];
        }
        cache[index] = createApi(index);
        return cache[index];
      },
    };
  }, []);

  return [ref, api];
};

export const useBox = (
  fn: BoxFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
): Api => useBody('Box', fn, (args) => args || [1, 1, 1], fwdRef);

export const useSphere = (
  fn: SphereFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
): Api => useBody('Sphere', fn, (radius) => radius ?? 1 as number, fwdRef);
