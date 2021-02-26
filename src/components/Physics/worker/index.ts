/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable new-cap */
/* eslint-disable no-restricted-globals */
import Ammo from '../ammo/ammo';

import WorkerEvent, * as Events from './events';
import {
  Shape,
  BodyProps,
  BoxProps,
  SphereProps,
  SubscribableValues,
} from './types';

import ProviderEvent, { FrameEvent } from '../events';

declare function postMessage(message: ProviderEvent, transfer?: Transferable[] | undefined): void;

async function initEngine(initProps: Events.InitializeEvent['props']) {
  const ammo = await Ammo({ locateFile: () => initProps.wasmPath });

  const bodies: Record<string, Ammo.btRigidBody> = {};
  const subscriptions: Record<number, [string, keyof SubscribableValues]> = {};

  let bodiesNeedSyncing = false;
  let lastCallTime = 0;

  const physicsWorld = createWorld();

  const transformAux1 = new ammo.btTransform();
  // const softBodyHelpers = new Ammo.btSoftBodyHelpers();

  function step(
    positions: Float32Array,
    quaternions: Float32Array,
  ): [FrameEvent, [ArrayBufferLike, ArrayBufferLike]] {
    const now = performance.now() / 1000;

    if (!lastCallTime) {
      physicsWorld.stepSimulation(1, 2);
    } else {
      const timeSinceLastCall = now - lastCallTime;
      physicsWorld.stepSimulation(timeSinceLastCall, 2);
    }
    lastCallTime = now;

    const nextPositions = new Float32Array(positions);
    const nextQuaternions = new Float32Array(quaternions);

    Object.values(bodies).forEach((body, i) => {
      body.getMotionState().getWorldTransform(transformAux1);
      const origin = transformAux1.getOrigin();
      const rotation = transformAux1.getRotation();
      nextPositions[3 * i + 0] = origin.x();
      nextPositions[3 * i + 1] = origin.y();
      nextPositions[3 * i + 2] = origin.z();
      nextQuaternions[4 * i + 0] = rotation.x();
      nextQuaternions[4 * i + 1] = rotation.y();
      nextQuaternions[4 * i + 2] = rotation.z();
      nextQuaternions[4 * i + 3] = rotation.w();
    });

    const observations: [number, SubscribableValues[keyof SubscribableValues]][] = [];

    Object.entries(subscriptions).forEach(([id, [uuid, type]]) => {
      const key = id as unknown as number;
      let value: Ammo.btVector3 | Ammo.btQuaternion | number;
      const body = bodies[uuid];
      if (type === 'position' || type === 'rotation') {
        body.getMotionState().getWorldTransform(transformAux1);
        value = type === 'position' ? transformAux1.getOrigin() : transformAux1.getRotation();
      } else if (type === 'margin') {
        value = body.getCollisionShape().getMargin();
      } else {
        value = body[`get${type.charAt(0).toUpperCase() + type.slice(0)}` as `get${Capitalize<typeof type>}`]();
      }

      if (value instanceof ammo.btVector3) {
        return observations.push([key, [value.x(), value.y(), value.z()]]);
      }
      if (value instanceof ammo.btQuaternion) {
        return observations.push([key, [value.x(), value.y(), value.z(), value.w()]]);
      }

      return observations.push([key, value]);
    });

    const message: FrameEvent = {
      type: 'frame',
      props: {
        positions: nextPositions,
        quaternions: nextQuaternions,
        observations,
        active: Boolean(Object.keys(bodies).length),
        bodies: bodiesNeedSyncing ? Object.keys(bodies) : undefined,
      },
    };

    if (bodiesNeedSyncing) {
      bodiesNeedSyncing = false;
    }

    return [message, [nextPositions.buffer, nextQuaternions.buffer]];
  }

  function addBodies(props: Events.AddBodiesEvent['props']): void {
    props.uuids.forEach((uuid, index) => {
      const bodyProps = props.props[index];

      const body = createRigidBody(props.type, bodyProps);

      if (bodyProps.type === 'Dynamic' || bodyProps.type === 'Kinematic') {
        body.setActivationState(4);
      }
      if (bodyProps.type === 'Kinematic') {
        body.setCollisionFlags(2);
      }
      if (bodyProps.friction) {
        body.setFriction(bodyProps.friction);
      }
      if (bodyProps.rollingFriction) {
        body.setRollingFriction(bodyProps.rollingFriction);
      }
      if (bodyProps.restitution) {
        body.setRestitution(bodyProps.restitution);
      }
      body.setDamping(
        bodyProps.linearDamping || 0,
        bodyProps.angularDamping || 0,
      );
      if (bodyProps.linearVelocity) {
        body.setLinearVelocity(new ammo.btVector3(...bodyProps.linearVelocity));
      }
      if (bodyProps.angularVelocity) {
        body.setAngularVelocity(new ammo.btVector3(...bodyProps.angularVelocity));
      }
      if (bodyProps.linearFactor) {
        body.setLinearFactor(new ammo.btVector3(...bodyProps.linearFactor));
      }
      if (bodyProps.angularFactor) {
        body.setAngularFactor(new ammo.btVector3(...bodyProps.angularFactor));
      }
      physicsWorld.addRigidBody(body);
      bodies[uuid] = body;
    });
    bodiesNeedSyncing = true;
  }

  function removeBodies(uuids: string[]) {
    uuids.forEach((uuid) => {
      const body = bodies[uuid];
      if (body instanceof ammo.btRigidBody) {
        physicsWorld.removeRigidBody(body);
      }
      delete bodies[uuid];
    });
    bodiesNeedSyncing = true;
  }

  function subscribe(id: number, uuid: string, type: keyof SubscribableValues) {
    subscriptions[id] = [uuid, type];
  }

  function unsubscribe(id: number) {
    delete subscriptions[id];
  }

  function createWorld(): Ammo.btDiscreteDynamicsWorld | Ammo.btSoftRigidDynamicsWorld {
    const collisionConfiguration = initProps.dynamics === 'Discrete'
      ? new ammo.btDefaultCollisionConfiguration()
      : new ammo.btSoftBodyRigidBodyCollisionConfiguration();
    const dispatcher = new ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = initProps.broadphase.type === 'Naive'
      ? new ammo.btDbvtBroadphase()
      : new Ammo.btAxisSweep3(
        new ammo.btVector3(...initProps.broadphase.aabbmin),
        new ammo.btVector3(...initProps.broadphase.aabbmax),
      );

    const solver = new ammo.btSequentialImpulseConstraintSolver();
    const world = initProps.dynamics === 'Discrete'
      ? new ammo.btDiscreteDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfiguration,
      )
      : new ammo.btSoftRigidDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfiguration,
        new ammo.btDefaultSoftBodySolver(),
      );

    world.setGravity(new ammo.btVector3(...initProps.gravity));
    return world;
  }

  function createRigidBody(shape: Shape, props: BodyProps): Ammo.btRigidBody {
    const transform = new ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new ammo.btVector3(
      ...(props.position || [0, 0, 0]),
    ));
    transform.setRotation(new ammo.btQuaternion(
      ...(props.rotation || [0, 0, 0, 1]),
    ));
    const motionState = new ammo.btDefaultMotionState(transform);
    const bodyShape = createShape(shape, props.args);

    const localInertia = new ammo.btVector3(0, 0, 0);
    bodyShape.calculateLocalInertia(
      props.type === 'Static' ? 0 : props.mass || 1,
      localInertia,
    );

    bodyShape.setMargin(props.margin || 0);

    const body = new ammo.btRigidBody(
      new ammo.btRigidBodyConstructionInfo(
        props.type === 'Static' ? 0 : props.mass || 1,
        motionState,
        bodyShape,
        localInertia,
      ),
    );

    return body;
  }

  function createShape(shape: Shape, args: unknown) {
    switch (shape) {
      case 'Box':
        return new ammo.btBoxShape(new ammo.btVector3(...(args as BoxProps['args'] || [0, 0, 0])));
      case 'Sphere':
        return new ammo.btSphereShape(args as SphereProps['args'] || 1);
      default:
        throw new Error('Unknown Shape Type');
    }
  }

  const onEvent = (event: WorkerEvent) => {
    switch (event.type) {
      case 'addBodies':
        addBodies(event.props);
        break;
      case 'removeBodies':
        removeBodies(event.props.uuids);
        break;
      case 'step': {
        const [msg, buffers] = step(event.props.positions, event.props.quaternions);
        postMessage(msg, buffers);
        break;
      }
      case 'subscribe':
        subscribe(event.props.id, event.props.uuid, event.props.name);
        break;
      case 'unsubscribe':
        unsubscribe(event.props.id);
        break;
      case 'setAngularDamping':
        bodies[event.props.uuid].setDamping(
          bodies[event.props.uuid].getLinearDamping(),
          event.props.value,
        );
        break;
      case 'setLinearDamping':
        bodies[event.props.uuid].setDamping(
          event.props.value,
          bodies[event.props.uuid].getAngularDamping(),
        );
        break;
      case 'setLinearVelocity':
        bodies[event.props.uuid].setLinearVelocity(
          new ammo.btVector3(...event.props.value),
        );
        break;
      case 'setAngularVelocity':
        bodies[event.props.uuid].setAngularVelocity(
          new ammo.btVector3(...event.props.value),
        );
        break;
      case 'setAngularFactor':
        bodies[event.props.uuid].setAngularFactor(
          new ammo.btVector3(...event.props.value),
        );
        break;
      case 'setLinearFactor':
        bodies[event.props.uuid].setLinearFactor(
          new ammo.btVector3(...event.props.value),
        );
        break;
      case 'setFriction':
        bodies[event.props.uuid].setFriction(event.props.value);
        break;
      case 'setRestitution':
        bodies[event.props.uuid].setRestitution(event.props.value);
        break;
      case 'setMargin':
        bodies[event.props.uuid].getCollisionShape().setMargin(event.props.value);
        break;
      case 'setPosition': {
        bodies[event.props.uuid].getMotionState().getWorldTransform(transformAux1);
        transformAux1.setOrigin(new ammo.btVector3(...event.props.value));
        bodies[event.props.uuid].getMotionState().setWorldTransform(transformAux1);
        break;
      }
      case 'setRotation': {
        bodies[event.props.uuid].getMotionState().getWorldTransform(transformAux1);
        transformAux1.setRotation(new ammo.btQuaternion(...event.props.value));
        bodies[event.props.uuid].getMotionState().setWorldTransform(transformAux1);
        break;
      }
      case 'applyForce':
        bodies[event.props.uuid].applyForce(
          new ammo.btVector3(...event.props.value[0]),
          new ammo.btVector3(...event.props.value[1]),
        );
        break;
      case 'applyCentralLocalForce':
        bodies[event.props.uuid].applyCentralLocalForce(
          new ammo.btVector3(...event.props.value[0]),
        );
        break;
      case 'applyImpulse':
        bodies[event.props.uuid].applyImpulse(
          new ammo.btVector3(...event.props.value[0]),
          new ammo.btVector3(...event.props.value[1]),
        );
        break;
      case 'applyCentralImpulse':
        bodies[event.props.uuid].applyCentralImpulse(
          new ammo.btVector3(...event.props.value[0]),
        );
        break;
      default:
        throw new Error(`Inappropriate event type [${event.type}]`);
    }
  };

  self.addEventListener('message', ({ data }: MessageEvent<WorkerEvent>) => onEvent(data));

  return (events: WorkerEvent[]) => events.forEach((event) => onEvent(event));
}

let eventsQueue: WorkerEvent[] = [];

const onInitMessage = ({ data: event }: MessageEvent<WorkerEvent>) => {
  if (event.type === 'init') {
    initEngine(event.props).then((registerEvents) => {
      registerEvents(eventsQueue);
      self.removeEventListener('message', onInitMessage);
      eventsQueue = [];
    });
  } else {
    eventsQueue.push(event);
  }
};

self.addEventListener('message', onInitMessage);
