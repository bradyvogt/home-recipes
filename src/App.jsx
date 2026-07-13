import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import AllRecipes from './AllRecipes.jsx';
import SingleRecipe from './SingleRecipe.jsx';
import AddRecipe from './AddRecipe.jsx';
import SignIn from './SignIn.jsx';
import SettingsPage from './SettingsPage.jsx';
import { getStoredDataSourceId } from './utils/supabaseClient';

// Main App Component - Manages state and displays recipes
const App = () => {
    const defaultPath = getStoredDataSourceId() ? `/${getStoredDataSourceId()}` : '/recipes';

    return (
        <BrowserRouter basename="/home-recipes">
        <Navbar /> {/*  Now inside, it can safely use <Link> */}
        <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route path="/login" element={<SignIn />} />
            <Route path="/recipe" element={<SingleRecipe />} />
            <Route path="/add-recipe" element={<AddRecipe />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="/:dataSourceId">
                <Route index element={<AllRecipes />} />
                <Route path="recipe" element={<SingleRecipe />} />
                <Route path="add-recipe" element={<AddRecipe />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
        </BrowserRouter>
    );
}

export default App;