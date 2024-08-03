async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
        localStorage.setItem('token', data.token);
        window.location.href = '/';
    } else {
        document.getElementById('status').innerText = data.message;
    }
}

async function saveText() {
    const text = document.getElementById('textbox').value;
    const token = localStorage.getItem('token');
    
    const response = await fetch('/textbox/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ text })
    });
    
    if (response.ok) {
        document.getElementById('status').innerText = 'Text saved successfully';
    } else {
        document.getElementById('status').innerText = 'Failed to save text';
    }
}

window.onload = async () => {
    const token = localStorage.getItem('token');
    
    if (token) {
        const response = await fetch('/textbox/get', {
            method: 'GET',
            headers: {
                'Authorization': token
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('textbox').value = data.text;
        }
    } else {
        window.location.href = '/login.html';
    }
};
