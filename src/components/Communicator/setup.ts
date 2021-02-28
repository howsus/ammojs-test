import { createContext } from 'react';

import EventEmmiter from '../../helpers/EventEmmiter';

export type Actions = {
  type: 'fell',
  payload: { uuid: string };
};

export type Emmiter = EventEmmiter<Actions>;

export type ProviderContext = {
  emmiter: EventEmmiter<Actions>;
};

export const context = createContext<ProviderContext>({} as ProviderContext);
