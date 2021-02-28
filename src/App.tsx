import React from 'react';
import { RecoilRoot } from 'recoil';

import MarbleGame from './scenes/MarbleGame';

const App: React.FC = () => (
  <RecoilRoot>
    <MarbleGame />
  </RecoilRoot>
);

export default App;
