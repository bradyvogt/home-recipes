import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import AllRecipes from './AllRecipes.jsx';

// Main App Component - Manages state and displays recipes
const App = () => {
    return (
        <BrowserRouter basename="/home-recipes">
        <Navbar /> {/*  Now inside, it can safely use <Link> */}
        <Routes>
            <Route path="/" element={<AllRecipes />} />
            <Route path="/add-recipe" element={<AllRecipes />} />
            <Route path="/settings" element={<AllRecipes />} />
        </Routes>
        </BrowserRouter>
    );
}

export default App;