import any from 'ramda/src/any';
import map from 'ramda/src/map';
import repeat from 'ramda/src/repeat';
import flatten from 'ramda/src/flatten';
import includes from 'ramda/src/includes';

const MEAN_BLOCK_SIZE = 42;

const getRandomEl = (array) => array[Math.floor(Math.random() * array.length)];

const F = (p, m) => Math.floor(Math.sqrt(
  p * (m ** 2),
));

const getMapSize = () => {
  const prob = Math.random();
  const cov = F(prob, MEAN_BLOCK_SIZE);

  const mapSizeRange = [
    MEAN_BLOCK_SIZE - cov,
    MEAN_BLOCK_SIZE + cov,
  ];

  return Math.floor(Math.random() * (mapSizeRange[1] - mapSizeRange[0] + 1) + mapSizeRange[0]);
};

const TYLE_SINGLE_SIMPLE = 1;
const TYLE_TRIPLE_CORNER = 2;
const TYLE_DOUBLE_EDGE = 3;
const TYLE_SINGLE_MOVING = 4;

const TYPES = [
  TYLE_SINGLE_SIMPLE,
  // TYLE_TRIPLE_CORNER,
  // TYLE_DOUBLE_EDGE,
  // TYLE_SINGLE_MOVING,
];

const DATA = {
  [TYLE_SINGLE_SIMPLE]: {
    ID: TYLE_SINGLE_SIMPLE,
    cost: 1,
    moving: false,
    angle: [...repeat(0, 25), 45],
    blockSize: [4, 4],
  },
  [TYLE_TRIPLE_CORNER]: {
    ID: TYLE_TRIPLE_CORNER,
    cost: 3,
    moving: false,
    angle: false,
    blockSize: [4, 4],
  },
  [TYLE_DOUBLE_EDGE]: {
    ID: TYLE_DOUBLE_EDGE,
    cost: 2,
    moving: false,
    angle: 30,
    blockSize: [4, 4],
  },
  [TYLE_SINGLE_MOVING]: {
    ID: TYLE_SINGLE_MOVING,
    cost: 1,
    moving: [
      ...repeat(false, 25),
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ],
    movingSpeed: [
      1.0,
      1.0,
      1.0,
      1.5,
      2.5,
    ],
    angle: [...repeat(0, 6), 45],
    blockSize: [4, 4],
  },
};

const adustDirectionAngle = (directionAngle) => {
  const possibleRelativeAngles = [
    +Math.PI / 2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // 0,
    // 0,
    // 0,
    // 0,
    // 0,
    // 0,
    // 0,
    -Math.PI / 2,
  ];

  return directionAngle + getRandomEl(possibleRelativeAngles);
};

const createSingle = (data, world) => {
  const angle = getRandomEl(data.angle);
  const directionAngle = adustDirectionAngle(world.previousDirectionAngle);

  const position = [
    world.previousPosition[0]
      + Math.cos(directionAngle) * data.blockSize[0], // * Math.cos(angle / (2 * Math.PI)),
    world.previousPosition[1],
    // + Math.cos(directionAngle) * data.blockSize[0]
    // + Math.sin(directionAngle) * data.blockSize[1],
    world.previousPosition[2]
      + Math.sin(directionAngle) * data.blockSize[1], // * Math.cos(angle / (2 * Math.PI)),
  ];

  const centerPoint = [
    position[0] + (data.blockSize[0] / 2),
    position[1],
    position[2] + (data.blockSize[1] / 2),
  ];

  // const neighborIsTooClose = any(
  //   (neighbor) => {
  //     const distanceBetweenCenters = Math.sqrt(
  //       (neighbor[0] - centerPoint[0]) ** 2
  //       + (neighbor[1] - centerPoint[1]) ** 2
  //       + (neighbor[2] - centerPoint[2]) ** 2,
  //     );

  //     console.log('distanceBetweenCenters', distanceBetweenCenters);

  //     return distanceBetweenCenters - 0.05 <= data.blockSize[0]
  //       || distanceBetweenCenters - 0.05 <= data.blockSize[1];
  //   },
  //   world.takenCoords,
  // );

  if (includes(centerPoint, world.takenCoords)) {
    return createSingle(data, world);
  }

  const single = {
    angle,
    position,
    centerPoint,
    directionAngle,
  };

  return single;
};

export default () => {
  let i = 0;
  const mapSize = getMapSize();
  const mapTypes = repeat(TYLE_SINGLE_SIMPLE, 4);

  while (i < mapSize) {
    const TYPE = TYPES[Math.floor(Math.random() * TYPES.length)];

    i += DATA[TYPE].cost;

    mapTypes.push(
      TYPE,
    );
  }

  const world = {
    takenCoords: [],
    previousDirectionAngle: 0,
    previousPosition: [-DATA[mapTypes[0]].blockSize[0], 0, 0],
  };

  return {
    tiles: flatten(map(
      (mapType) => {
        let tile = null;
        const data = DATA[mapType];

        if (includes(mapType, [TYLE_SINGLE_SIMPLE, TYLE_SINGLE_MOVING])) {
          tile = createSingle(
            data,
            world,
          );
        }

        console.log('CenterPoint: ', tile.centerPoint);

        world.takenCoords.push(tile.centerPoint);
        world.previousPosition = tile.position;
        world.previousDirectionAngle = tile.directionAngle;

        return tile;
      },
      mapTypes,
    )),
  };
};
