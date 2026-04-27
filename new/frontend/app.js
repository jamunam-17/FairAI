const API_URL = window.location.origin;
let shapChartInstance = null;
let fairnessChartInstance = null;

// -- Auth helpers --
function getUsers() {
    return JSON.parse(localStorage.getItem('fairai_users') || '{}');
}
function saveUsers(users) {
    localStorage.setItem('fairai_users', JSON.stringify(users));
}
function showError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
}
function hideMsg(id) {
    document.getElementById(id).style.display = 'none';
}

// -- Toggle between Login & Register --
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'block';
    hideMsg('login-error');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
    hideMsg('register-error');
    hideMsg('register-success');
});

// -- Register Form Submit --
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    hideMsg('register-error');
    hideMsg('register-success');

    const name     = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    if (!name || !username || !password) {
        showError('register-error', 'All fields are required.');
        return;
    }
    const users = getUsers();
    if (users[username]) {
        showError('register-error', 'Username already exists.');
        return;
    }
    users[username] = { name, password };
    saveUsers(users);
    document.getElementById('register-success').textContent = "Success! Redirecting...";
    document.getElementById('register-success').style.display = 'block';
    setTimeout(() => {
        document.getElementById('register-card').style.display = 'none';
        document.getElementById('login-card').style.display = 'block';
    }, 1500);
});

// -- Login Form Submit --
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const users = getUsers();
    if ((users[username] && users[username].password === password) || Object.keys(users).length === 0) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
    } else {
        showError('login-error', 'Incorrect username or password.');
    }
});

// Navigation
function showView(viewId) {
    ['view-dashboard', 'view-fairness', 'view-upload'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}
document.getElementById('nav-dashboard').addEventListener('click', () => showView('view-dashboard'));
document.getElementById('nav-fairness').addEventListener('click', () => { showView('view-fairness'); loadFairnessMetrics(); });
document.getElementById('nav-upload').addEventListener('click', () => showView('view-upload'));

// -- Prediction --
document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const useMitigated = document.getElementById('mitigation-toggle').checked;
    const formData = {
        age: parseInt(document.getElementById('age').value),
        workclass: document.getElementById('workclass').value,
        fnlwgt: 100000, education: "Bachelors", education_num: 13,
        marital_status: "Married", occupation: "Prof-specialty",
        relationship: "Husband", race: document.getElementById('race').value,
        sex: document.getElementById('sex').value,
        capital_gain: 0, capital_loss: 0, hours_per_week: 40,
        native_country: "United-States", use_mitigated_model: useMitigated
    };

    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        const outcomeEl = document.getElementById('outcome-display');
        outcomeEl.textContent = data.prediction;
        outcomeEl.className = 'outcome ' + (data.prediction.includes("Approved") ? 'approved' : 'rejected');
        renderShapChart(data.shap_values);
    } catch (error) { alert("Error connecting to backend!"); }
});

async function loadFairnessMetrics() {
    const response = await fetch(`${API_URL}/metrics`);
    const metrics = await response.json();
    const ctx = document.getElementById('fairnessChart').getContext('2d');
    if(fairnessChartInstance) fairnessChartInstance.destroy();
    fairnessChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['DP Difference', 'EO Difference'],
            datasets: [
                { label: 'Standard', data: [metrics.standard.demographic_parity_diff, metrics.standard.equal_opportunity_diff], backgroundColor: '#f25c6e' },
                { label: 'Mitigated', data: [metrics.mitigated.demographic_parity_diff, metrics.mitigated.equal_opportunity_diff], backgroundColor: '#10d9a0' }
            ]
        }
    });
}

function renderShapChart(shapData) {
    const ctx = document.getElementById('shapChart').getContext('2d');
    if(shapChartInstance) shapChartInstance.destroy();
    shapChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: shapData.map(d => d.feature),
            datasets: [{ data: shapData.map(d => d.value), backgroundColor: shapData.map(d => d.value > 0 ? '#f25c6e' : '#3b82f6') }]
        },
        options: { indexAxis: 'y' }
    });
}
