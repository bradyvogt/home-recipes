import React from 'react';
import { queryParamToName } from './utils/helpers';

const SingleRecipe = () => {
    const searchParams = new URLSearchParams(window.location.search);
    
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Recipe Detail</h1>
            <p>Viewing: <strong>{queryParamToName(searchParams.get('name') || 'No Recipe Found')}</strong></p>
        </div>
    );
}

export default SingleRecipe;
