import { AuthProvider, useAuthContext } from "@asgardeo/auth-react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Contact from "./pages/ChatRoom";
import PageNotFound from "./pages/PageNotFound";
import "./App.css";
import Unauthenticated from "./pages/Unauthenticated";
import { ReactNode, useEffect, useState } from "react";
import React from "react";
import ChatRoom from "./pages/ChatRoom";

const authConfig = {
  signInRedirectURL: "http://localhost:3000",
  signOutRedirectURL: "http://localhost:3000",
  clientID: "owbVZdTq_x6Sfqj5RaX2CW4_CQMa",
  baseUrl: "https://api.asgardeo.io/t/thushaniprivate",
  scope: ["openid", "profile", "email"],
};

const AppContent = () => {
  const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { state } = useAuthContext();

    if (!state.isAuthenticated) {
      return <Unauthenticated />;
    }

    return children;
  };

  const { getBasicUserInfo, getAccessToken } = useAuthContext();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    getAccessToken()
      .then((accessToken) => {
        setToken(accessToken);
      })
      .catch((error) => {
        console.log(error, "error");
      });

    getBasicUserInfo()
      .then((basicUserDetails) => {
        console.log(basicUserDetails);
        setEmail(basicUserDetails.email ? basicUserDetails.email : "");
      })
      .catch((error) => {
        console.log(error, "error");
      });
  }, []);

  return (
    <Routes>
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <ChatRoom
              chatroomId={"Personal"}
              bearerAccessToken={token}
              nickname={email}
            />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider config={authConfig}>
    <Router>
      <AppContent />
    </Router>
  </AuthProvider>
);

export default App;
