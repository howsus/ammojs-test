import React from 'react';

import { usePlane } from '../Physics';

export type PlaneProps = {
  onCollide: () => void;
};

const Plane: React.FC<PlaneProps> = ({ onCollide }: PlaneProps) => {
  const [ref] = usePlane(() => ({
    type: 'Static',
    args: [0, 1, 0],
    position: [0, -10, 0],
    margin: 0.05,
    material: {
      restitution: 1,
      rollingFriction: 10,
    },
    onCollide,
  }));

  return (
    <mesh ref={ref} />
  );
};

export default Plane;
