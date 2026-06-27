import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import AllRecipes from './AllRecipes.jsx';
import SingleRecipe from './SingleRecipe.jsx';
import AddRecipe from './AddRecipe.jsx';
import SignIn from './SignIn.jsx';

// Main App Component - Manages state and displays recipes
const App = () => {
    return (
        <BrowserRouter basename="/home-recipes">
        <Navbar /> {/*  Now inside, it can safely use <Link> */}
        <Routes>
            <Route path="/add-recipe" element={<AddRecipe />} />
            <Route path="/recipe" element={<SingleRecipe />} />
            <Route path="/settings" element={<AllRecipes />} />
            <Route path="/login" element={<SignIn />} />
            <Route path="/" element={<AllRecipes />} />
        </Routes>
        </BrowserRouter>
    );
}

export default App;