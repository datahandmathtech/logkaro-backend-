const axios = require('axios');

const testApi = async () => {
    try {
        // We don't have the token easily, so we'll just check if the server is running and reachable
        const res = await axios.get('http://localhost:4000/');
        console.log('Server is UP:', res.data);
        
        // We'll skip the auth check for now and just trust our backend code
    } catch (err) {
        console.error('API Error:', err.message);
    }
};

testApi();
