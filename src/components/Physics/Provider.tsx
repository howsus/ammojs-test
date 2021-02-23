import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useThree, useFrame } from 'react-three-fiber';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Ammo from 'worker-loader!./worker'; // eslint-disable-line import/no-webpack-loader-syntax, import/no-unresolved

import {
  context,
  Refs,
  Buffers,
  Subscriptions,
  ProviderContext,
} from './setup';
import { PhysicsEvent, InitialEvent } from './worker/events';

export type ProviderProps = InitialEvent['props'] & {
  children: () => React.ReactNode;
  size?: number;
};

const Provider: React.FC<ProviderProps> = ({
  children,
  size = 1000,
  ...props
}: ProviderProps) => {
  const { gl, invalidate } = useThree();
  const [initialized, setInitialized] = useState(false);
  const [worker] = useState<Worker>(() => new Ammo<Worker>());
  const [refs] = useState<Refs>({});
  const [buffers] = useState<Buffers>(() => ({
    positions: new Float32Array(size * 3),
    quaternions: new Float32Array(size * 4),
  }));
  const [subscriptions] = useState<Subscriptions>({});
  const bodies = useRef<{ [uuid: string]: number }>({});

  const postMessage = useCallback(
    (event: PhysicsEvent, transfer?: Transferable[]) => (transfer
      ? worker.postMessage(event, transfer)
      : worker.postMessage(event)),
    [worker],
  );

  const loop = useMemo(
    () => () => {
      if (buffers.positions.byteLength !== 0 && buffers.quaternions.byteLength !== 0) {
        postMessage(
          { operation: 'step', ...buffers },
          [buffers.positions.buffer, buffers.quaternions.buffer],
        );
      }
    },
    [],
  );

  const prevPresenting = useRef(false);
  useFrame(() => {
    if (gl.xr?.isPresenting && !prevPresenting.current) {
      gl.xr.getSession().requestAnimationFrame(loop);
    }
    if (!gl.xr?.isPresenting && prevPresenting.current) {
      requestAnimationFrame(loop);
    }
    prevPresenting.current = gl.xr?.isPresenting;
  });

  useEffect(() => {
    const onLoaded = () => {
      postMessage({
        operation: 'init',
        props,
      });
      loop();
    };

    const onFrame = (data: any) => {
      if (data.bodies) {
        bodies.current = data.bodies.reduce(
          (acc: any, id: any) => ({ ...acc, [id]: data.bodies.indexOf(id) }),
          {},
        );
      }
      buffers.positions = data.positions;
      buffers.quaternions = data.quaternions;
      data.observations.forEach(([id, value]: any) => subscriptions[id](value));
      if (gl.xr && gl.xr.isPresenting) {
        gl.xr.getSession().requestAnimationFrame(loop);
      } else {
        requestAnimationFrame(loop);
      }
      if (data.active) invalidate();
    };

    worker.onmessage = (e) => {
      switch (e.data.operation) {
        case 'frame':
          onFrame(e.data);
          break;
        case 'ready':
          setInitialized(true);
          break;
        case 'loaded':
          onLoaded();
          break;
        default:
          break;
      }
    };
    return () => worker.terminate();
  }, []);

  const api = useMemo(() => ({
    worker,
    postMessage,
    bodies,
    refs,
    buffers,
    subscriptions,
  }), [
    worker,
    postMessage,
    bodies,
    refs,
    buffers,
    subscriptions,
  ]);

  return (
    <context.Provider value={api as ProviderContext}>
      {initialized && children()}
    </context.Provider>
  );
};

export default Provider;
