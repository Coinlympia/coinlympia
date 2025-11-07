declare module 'react' {
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type ReactNode = any;
  export type ComponentType<P = {}> = any;
  export type ComponentProps<T> = any;
  export type SyntheticEvent<T = Element, E = Event> = {
    currentTarget: T;
    target: T;
    nativeEvent: E;
    preventDefault(): void;
    stopPropagation(): void;
    isDefaultPrevented(): boolean;
    isPropagationStopped(): boolean;
    persist(): void;
    timeStamp: number;
    type: string;
  };

  export function createContext<T>(defaultValue: T): any;
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: any): T;
  export function useReducer<R extends (prevState: any, action: any) => any>(
    reducer: R,
    initialState: Parameters<R>[0]
  ): [Parameters<R>[0], (action: Parameters<R>[1]) => void];
  export function memo<P extends object>(component: ComponentType<P>): ComponentType<P>;
  export function Suspense(props: { children: ReactNode; fallback?: ReactNode }): ReactNode;
  export function Fragment(props: { children?: ReactNode }): ReactNode;
  export function createElement(type: any, props?: any, ...children: any[]): any;
}
