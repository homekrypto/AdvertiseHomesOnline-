import { Switch, Route } from "wouter";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Home from "./pages/Home.tsx";
import Properties from "./pages/Properties.tsx";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/properties" component={Properties} />
        <Route path="/" component={Home} />
      </Switch>
    </div>
  );
}