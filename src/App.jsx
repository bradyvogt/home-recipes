import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
            <Route path="/" element={<Navigate to="/recipes" replace />} />
            <Route path="/login" element={<SignIn />} />
            <Route path="/recipe" element={<SingleRecipe />} />
            <Route path="/add-recipe" element={<AddRecipe />} />
            <Route path="/settings" element={<AllRecipes />} />

            <Route path="/:dataSourceId">
                <Route index element={<AllRecipes />} />
                <Route path="recipe" element={<SingleRecipe />} />
                <Route path="add-recipe" element={<AddRecipe />} />
                <Route path="settings" element={<AllRecipes />} />
            </Route>
        </Routes>
        </BrowserRouter>
    );
}

export default App;