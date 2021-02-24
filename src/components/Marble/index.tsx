import React, { useEffect, useCallback } from 'react';
import { useThree } from 'react-three-fiber';

import { useSphere } from '../Physics';

export type MarbleProps = {
  position: [number, number, number];
};

const Marble: React.FC<MarbleProps> = ({ ...props }: MarbleProps) => {
  const { camera } = useThree();
  const [ref, { position, linearVelocity }] = useSphere(() => ({
    mass: 1,
    args: 1,
    material: {
      restitution: 0.5,
      friction: 1000,
    },
    ...props,
  }));

  const moveDirection = {
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
  };

  const handleKey = (event: KeyboardEvent, action = 0) => {
    const { keyCode } = event;

    switch (keyCode) {
      case 87: // W: FORWARD
        moveDirection.forward = action;
        break;
      case 83: // S: BACKWARD
        moveDirection.backward = action;
        break;
      case 65: // A: LEFT
        moveDirection.left = action;
        break;
      case 68: // D: RIGHT
        moveDirection.right = action;
        break;
      default:
        break;
    }

    if (Math.max(...Object.values(moveDirection)) === 1) {
      moveBall();
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => handleKey(event, 0),
    [],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => handleKey(event, 1),
    [],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => position.subscribe((value) => {
    camera.lookAt(value[0], value[1], value[2]);
    camera.position.set(value[0] - 5, value[1] + 10, value[2] - 5);
  }), []);

  const moveBall = () => {
    const scalingFactor = 1;
    const moveX = moveDirection.right - moveDirection.left;
    const moveZ = moveDirection.backward - moveDirection.forward;

    if (moveX === 0 && moveZ === 0) {
      // return;
    }

    // position.set(10, 0, 0);

    // console.log('moveX', linearVelocity.get());

    // const resultantImpulse = new Ammo.btVector3(moveX, moveY, moveZ);
    // resultantImpulse.op_mul(scalingFactor);
    // let physicsBody = ballObject.userData.physicsBody;
    // physicsBody.setLinearVelocity( resultantImpulse );
    // linearVelocity
    linearVelocity.set(moveX * 20, 0, moveZ * 20);
  };

  return (
    <mesh
      {...props}
      ref={ref}
      receiveShadow
      castShadow
      onClick={() => {
        linearVelocity.set(1, 0, 0);
      }}
    >
      <sphereBufferGeometry attach="geometry" args={[1, 32, 32]} />
      <meshStandardMaterial attach="material" metalness={0.1} color="orange" />
    </mesh>
  );
};

export default Marble;
