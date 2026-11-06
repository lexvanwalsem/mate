import { createRoot } from "react-dom/client";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import App from "./App";
import "./styles.css";
import "./polish.css";
import "./mascot.css";
import "./layout.css";
import "./motion.css";
import "./dark.css";

createRoot(document.getElementById("root")!).render(<App />);
