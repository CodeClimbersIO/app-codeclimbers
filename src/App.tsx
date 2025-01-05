import "./App.css";
import { AppRouter } from "./routes";
import { ThemeProvider } from "@/components/ThemeProvider"
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBqbGqePKf9VqzXjlrNLDyNVaeNlCdINKw",
  authDomain: "ebbdesktop.firebaseapp.com",
  projectId: "ebbdesktop",
  storageBucket: "ebbdesktop.firebasestorage.app",
  messagingSenderId: "640927105603",
  appId: "1:640927105603:web:a824d5d57a9ac39ef7caf6",
  measurementId: "G-JYJ4PNT1F1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <main>
        <AppRouter />
      </main>
    </ThemeProvider>
  );
}

export default App;
