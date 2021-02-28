import React from 'react';

import { usePlane } from '../Physics';
import { useCommunicator } from '../Communicator';

const Plane: React.FC = () => {
  const { emit } = useCommunicator();

  const [ref] = usePlane(() => ({
    type: 'Static',
    args: [0, 1, 0],
    position: [0, -10, 0],
    margin: 0.05,
    material: {
      restitution: 1,
      rollingFriction: 10,
    },
    onCollide: ({ target }) => emit('fell', { uuid: target.uuid }),
  }));

  return (
    <mesh ref={ref} />
  );
};

export default Plane;
