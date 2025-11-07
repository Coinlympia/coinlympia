import { ReactNode, useState } from "react";
import { AuthStateContext, AuthUser } from "../context/AuthContext";

interface Props {
  children: ReactNode;
}

export function AuthStateProvider({ children }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | undefined>(undefined);

  return (
    <AuthStateContext.Provider
      value={{ isLoggedIn, setIsLoggedIn, user, setUser }}
    >
      {children}
    </AuthStateContext.Provider>
  );
}
