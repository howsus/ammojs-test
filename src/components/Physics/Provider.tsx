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
import WorkerEvent, { InitializeEvent } from './worker/events';
import ProviderEvent, { FrameEvent } from './events';

export type ProviderProps = InitializeEvent['props'] & {
  children: React.ReactNode;
  size?: number;
};

const Provider: React.FC<ProviderProps> = ({
  children,
  size = 1000,
  ...props
}: ProviderProps) => {
  const { gl, invalidate } = useThree();
  const [worker] = useState<Worker>(() => new Ammo<Worker>());
  const [refs] = useState<Refs>({});
  const [buffers] = useState<Buffers>(() => ({
    positions: new Float32Array(size * 3),
    quaternions: new Float32Array(size * 4),
  }));
  const [subscriptions] = useState<Subscriptions>({});
  const bodies = useRef<{ [uuid: string]: number }>({});

  const postMessage = useCallback(
    (event: WorkerEvent, transfer?: Transferable[]) => (transfer
      ? worker.postMessage(event, transfer)
      : worker.postMessage(event)),
    [worker],
  );

  const loop = useMemo(
    () => () => {
      if (buffers.positions.byteLength !== 0 && buffers.quaternions.byteLength !== 0) {
        postMessage(
          {
            type: 'step',
            props: {
              positions: buffers.positions,
              quaternions: buffers.quaternions,
            },
          },
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
    const onFrame = (data: FrameEvent['props']) => {
      if (data.bodies) {
        bodies.current = data.bodies.reduce(
          (acc, id: string) => ({ ...acc, [id]: data.bodies?.indexOf(id) }),
          {},
        );
      }
      buffers.positions = data.positions;
      buffers.quaternions = data.quaternions;
      data.observations.forEach(([id, value]) => subscriptions[id](value));

      if (gl.xr && gl.xr.isPresenting) {
        gl.xr.getSession().requestAnimationFrame(loop);
      } else {
        requestAnimationFrame(loop);
      }
      if (data.active) invalidate();
    };

    worker.onmessage = (e: MessageEvent<ProviderEvent>) => {
      switch (e.data.type) {
        case 'frame':
          onFrame(e.data.props);
          break;
        default:
          break;
      }
    };

    postMessage({
      type: 'init',
      props,
    });
    loop();

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
      {children}
    </context.Provider>
  );
};

export default Provider;
