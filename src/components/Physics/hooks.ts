import { useFrame } from 'react-three-fiber';
import { Object3D, InstancedMesh, DynamicDrawUsage } from 'three';
import React, {
  useRef, useContext, useLayoutEffect, useMemo,
} from 'react';

import { Buffers, context } from './setup';

import {
  Shape,
  AtomicProps,
  BodyProps,
  BoxProps,
  PlaneProps,
  SphereProps,
  CylinderProps,
  SubscribableValues,
} from './worker/types';
import { AddBodiesEvent } from './worker/events';

export type BodyFn = (index: number) => BodyProps
export type BoxFn = (index: number) => BoxProps;
export type PlaneFn = (index: number) => PlaneProps;
export type SphereFn = (index: number) => SphereProps;
export type CylinderFn = (index: number) => CylinderProps;

type ArgFn = (props: unknown) => unknown;

type WorkerVec<T extends keyof SubscribableValues> = {
  set: (value: SubscribableValues[T]) => void
  subscribe: (callback: (value: SubscribableValues[T]) => void) => void
}

export type WorkerProps<T> = {
  [K in keyof T]: {
    set: (value: NonNullable<T[K]>) => void
    subscribe: (callback: (value: NonNullable<T[K]>) => void) => () => void
  }
}

export type WorkerApi = WorkerProps<AtomicProps> & {
  position: WorkerVec<'position'>;
  rotation: WorkerVec<'rotation'>;
  linearVelocity: WorkerVec<'linearVelocity'>;
  angularVelocity: WorkerVec<'angularVelocity'>;
  linearFactor: WorkerVec<'linearFactor'>;
  angularFactor: WorkerVec<'angularFactor'>;
  applyForce: (
    force: [x: number, y: number, z: number],
    worldPoint: [x: number, y: number, z: number],
  ) => void
  applyImpulse: (
    impulse: [x: number, y: number, z: number],
    worldPoint: [x: number, y: number, z: number],
  ) => void
  applyCentralLocalForce: (force: [x: number, y: number, z: number]) => void
  applyCentralImpulse: (impulse: [x: number, y: number, z: number]) => void
}

type PublicApi = WorkerApi & { at: (index: number) => WorkerApi };

export type Api = [React.MutableRefObject<THREE.Object3D | undefined>, PublicApi];

const temp = new Object3D();

function prepare(object: Object3D, props: BodyProps, argFn: ArgFn) {
  object.position.set(...((props.position || [0, 0, 0]) as [number, number, number]));
  object.rotation.set(...((props.rotation || [0, 0, 0]) as [number, number, number]));
  return { ...props, onCollide: Boolean(props.onCollide), args: argFn(props.args) };
}

function apply(object: THREE.Object3D, index: number, buffers: Buffers) {
  if (index !== undefined) {
    object.position.fromArray(buffers.positions, index * 3);
    object.quaternion.fromArray(buffers.quaternions, index * 4);
  }
}

let subscriptionGuid = 0;

export const useBody = (
  type: Shape,
  fn: BodyFn,
  argFn: ArgFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
): Api => {
  const localRef = useRef<THREE.Object3D>((null as unknown) as THREE.Object3D);
  const ref = fwdRef || localRef;
  const {
    postMessage, bodies, buffers, refs, subscriptions, events,
  } = useContext(context);

  useLayoutEffect(() => {
    if (!ref.current) {
      ref.current = new Object3D();
    }

    const object = ref.current;

    let uuid = [object.uuid];
    let props: AddBodiesEvent['props']['props'];

    if (object instanceof InstancedMesh) {
      object.instanceMatrix.setUsage(DynamicDrawUsage);
      uuid = new Array(object.count).fill(0).map((_, i) => `${object.uuid}/${i}`);

      props = uuid.map((id, i) => {
        const objectProps = fn(i);
        const preparedProps = prepare(temp, objectProps, argFn);
        if (objectProps.onCollide) {
          events[uuid[i]] = objectProps.onCollide;
        }
        temp.updateMatrix();
        object.setMatrixAt(i, temp.matrix);
        object.instanceMatrix.needsUpdate = true;
        return preparedProps;
      });
    } else {
      const objectProps = fn(0);
      if (objectProps.onCollide) {
        events[uuid[0]] = objectProps.onCollide;
      }
      props = [prepare(object, objectProps, argFn)];
    }

    props.forEach((objectProps, index) => {
      refs[uuid[index]] = object;
    });

    postMessage({
      type: 'addBodies',
      props: {
        type,
        uuids: uuid,
        props,
      },
    });

    return () => {
      props.forEach((_, index) => {
        delete refs[uuid[index]];
        if (_.onCollide) delete events[uuid[index]];
      });
      postMessage({ type: 'removeBodies', props: { uuids: uuid } });
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

    function makeType<T extends string>(name: T): `set${Capitalize<keyof SubscribableValues>}` {
      return `set${name.charAt(0).toUpperCase()}${name.slice(1)}` as `set${Capitalize<keyof SubscribableValues>}`;
    }

    function make<
      T extends keyof SubscribableValues,
    >(name: T, index?: number) {
      return {
        set: (value: SubscribableValues[T]) => ref.current && postMessage({
          type: makeType(name),
          props: { value: value as never, uuid: getUUID(index) },
        }),
        subscribe: (
          callback: (value: SubscribableValues[T]) => void,
        ) => {
          subscriptionGuid += 1;
          const id = subscriptionGuid;
          subscriptions[id] = callback as never;
          postMessage({ type: 'subscribe', props: { id, name, uuid: getUUID(index) } });
          return () => {
            delete subscriptions[id];
            postMessage({ type: 'unsubscribe', props: { id, name, uuid: getUUID(index) } });
          };
        },
      };
    }

    const createApi = (index?: number): WorkerApi => ({
      position: make('position', index),
      rotation: make('rotation', index),
      linearVelocity: make('linearVelocity', index),
      angularVelocity: make('angularVelocity', index),
      linearFactor: make('linearFactor', index),
      angularFactor: make('angularFactor', index),
      friction: make('friction', index),
      restitution: make('restitution', index),
      rollingFriction: make('rollingFriction', index),
      linearDamping: make('linearDamping', index),
      angularDamping: make('angularDamping', index),
      margin: make('margin', index),
      applyForce: (
        force: [x: number, y: number, z: number],
        worldPoint: [x: number, y: number, z: number],
      ) => ref.current && postMessage({
        type: 'applyForce',
        props: { value: [force, worldPoint], uuid: getUUID(index) },
      }),
      applyImpulse: (
        force: [x: number, y: number, z: number],
        worldPoint: [x: number, y: number, z: number],
      ) => ref.current && postMessage({
        type: 'applyImpulse',
        props: { value: [force, worldPoint], uuid: getUUID(index) },
      }),
      applyCentralLocalForce: (
        force: [x: number, y: number, z: number],
      ) => ref.current && postMessage({
        type: 'applyCentralLocalForce',
        props: { value: [force, [0, 0, 0]], uuid: getUUID(index) },
      }),
      applyCentralImpulse: (
        force: [x: number, y: number, z: number],
      ) => ref.current && postMessage({
        type: 'applyCentralImpulse',
        props: { value: [force, [0, 0, 0]], uuid: getUUID(index) },
      }),
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

export const usePlane = (
  fn: PlaneFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
): Api => useBody('Plane', fn, (args) => args || [1, 1, 1], fwdRef);

export const useSphere = (
  fn: SphereFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
): Api => useBody('Sphere', fn, (radius) => radius ?? 1 as number, fwdRef);

export const useCylinder = (
  fn: CylinderFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
): Api => useBody('Cylinder', fn, (args) => args || [1, 1, 1], fwdRef);

export type {
  BoxProps,
  PlaneProps,
  SphereProps,
  CylinderProps,
};
