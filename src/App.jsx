import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import AllRecipes from './AllRecipes.jsx';
import SingleRecipe from './SingleRecipe.jsx';
import AddRecipe from './AddRecipe.jsx';
import SignIn from './SignIn.jsx';
import SettingsPage from './SettingsPage.jsx';
import { getStoredDataSourceId } from './utils/supabaseClient';

const NEW_APP_URL = 'https://bradyvogt.github.io/home-recipes-dev-frontend/';

// Main App Component - Manages state and displays recipes
const App = () => {
    const defaultPath = getStoredDataSourceId() ? `/${getStoredDataSourceId()}` : '/recipes';

    return (
        <BrowserRouter basename="/home-recipes">
            <aside className="migration-banner" aria-label="New Home Recipes app">
                <p className="migration-message">
                    Please switch to the new Home Recipes app. This version still works, but we strongly encourage the move.
                </p>
                <a
                    className="migration-button"
                    href={NEW_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Go to the new app
                </a>
            </aside>
            <Navbar />
            <Routes>
                <Route path="/" element={<Navigate to={defaultPath} replace />} />
                <Route path="/login" element={<SignIn />} />
                <Route path="/recipe" element={<SingleRecipe />} />
                <Route path="/add-recipe" element={<AddRecipe />} />
                <Route path="/settings" element={<SettingsPage />} />

                <Route path="/:dataSourceId">
                    <Route index element={<AllRecipes />} />
                    <Route path="recipes" element={<AllRecipes />} />
                    <Route path="recipe" element={<SingleRecipe />} />
                    <Route path="add-recipe" element={<AddRecipe />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;