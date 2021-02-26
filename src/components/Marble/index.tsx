import React, { useEffect, useCallback } from 'react';
import { useThree } from 'react-three-fiber';

import { useSphere } from '../Physics';

export type MarbleProps = {
  position: [number, number, number];
};

const Marble: React.FC<MarbleProps> = ({ ...props }: MarbleProps) => {
  const { camera } = useThree();
  const [ref, { position, applyImpulse }] = useSphere(() => ({
    mass: 1,
    args: 1,
    type: 'Dynamic',
    restitution: 0.5,
    friction: 1,
    rollingFriction: 10,
    linearDamping: 0.1,
    ...props,
  }));

  const moveDirection = {
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    upward: 0,
  };

  const handleKey = (event: KeyboardEvent, action = 0) => {
    const { key } = event;

    switch (key) {
      case 'w': // W: FORWARD
        moveDirection.forward = action;
        break;
      case 's': // S: BACKWARD
        moveDirection.backward = action;
        break;
      case 'a': // A: LEFT
        moveDirection.left = action;
        break;
      case 'd': // D: RIGHT
        moveDirection.right = action;
        break;
      case ' ': // SPACE: UPWARD
        moveDirection.upward = action;
        break;
      default:
        break;
    }

    if (Math.max(...Object.values(moveDirection)) === 1) {
      moveBall();
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => handleKey(event, 1),
    [],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => handleKey(event, 0),
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
    let cameraDirectionVector = [
      0,
      0,
    ];

    if (ref && ref.current) {
      cameraDirectionVector = [
        ref.current.position.x - camera.position.x,
        ref.current.position.z - camera.position.z,
      ];

      const normFactor = Math.max(
        Math.abs(cameraDirectionVector[0]),
        Math.abs(cameraDirectionVector[1]),
      );

      cameraDirectionVector = [
        cameraDirectionVector[0] / normFactor,
        cameraDirectionVector[1] / normFactor,
      ];
    }

    const moveX = moveDirection.right - moveDirection.left;
    const moveZ = moveDirection.backward - moveDirection.forward;
    const moveY = moveDirection.upward;

    if (moveX === 0 && moveY === 0 && moveZ === 0) {
      return;
    }

    applyImpulse(
      [moveZ * -1, 0, moveX],
      [0, 0, 0],
    );

    // if (moveY) {
    //   applyForce([0, moveY * 500, 0], [0, 0, 0]);
    // }
  };

  return (
    <mesh
      {...props}
      ref={ref}
      receiveShadow
      castShadow
    >
      <sphereBufferGeometry attach="geometry" args={[1, 32, 32]} />
      <meshStandardMaterial attach="material" metalness={0.1} color="orange" />
    </mesh>
  );
};

export default Marble;
