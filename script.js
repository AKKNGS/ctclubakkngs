// ដូរ URL នេះជាមួយ Web App URL ដែលអ្នកបាន Deploy ពី Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyX__TvTzq0cyrVnV7MTHwOz_0kigHULkjZPb3MpUyFy75f-EEAil5r6CS8cV3YPC4y/exec';

// ការចុះឈ្មោះ Service Worker សម្រាប់ PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then(() => console.log("Service Worker Registered"));
}

// មុខងារ Login (ឧទាហរណ៍សាមញ្ញ)
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    if (user === 'admin' && pass === '1234') {
        document.getElementById('login-container').classList.remove('active');
        document.getElementById('dashboard-container').classList.add('active');
        loadData();
    } else {
        document.getElementById('login-error').innerText = "ឈ្មោះគណនី ឬ លេខសម្ងាត់មិនត្រឹមត្រូវ!";
    }
}

function logout() {
    document.getElementById('dashboard-container').classList.remove('active');
    document.getElementById('login-container').classList.add('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// ទាញយកទិន្នន័យពី Google Sheet
async function loadData() {
    document.getElementById('loading').style.display = 'block';
    const response = await fetch(SCRIPT_URL);
    const data = await response.json();
    
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row['លរ']}</td>
            <td>${row['ឈ្មោះ']}</td>
            <td>${row['ភេទ']}</td>
            <td>${row['ថ្នាក់']}</td>
            <td>${row['កំណត់សម្គាល់']}</td>
            <td>
                <button class="edit-btn" onclick="openModal('${row['លរ']}', '${row['ឈ្មោះ']}', '${row['ភេទ']}', '${row['ថ្នាក់']}', '${row['កំណត់សម្គាល់']}')">កែប្រែ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('loading').style.display = 'none';
}

// បើកផ្ទាំងកែប្រែ
function openModal(id, name, gender, className, note) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-gender').value = gender;
    document.getElementById('edit-class').value = className;
    document.getElementById('edit-note').value = note;
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// រក្សាទុកទិន្នន័យត្រឡប់ទៅ Google Sheet វិញ
async function saveData() {
    const btn = document.querySelector('.save-btn');
    btn.innerText = "កំពុងរក្សាទុក...";
    
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const gender = document.getElementById('edit-gender').value;
    const className = document.getElementById('edit-class').value;
    const note = document.getElementById('edit-note').value;

    const formData = new URLSearchParams();
    formData.append('action', 'update');
    formData.append('id', id);
    formData.append('name', name);
    formData.append('gender', gender);
    formData.append('className', className);
    formData.append('note', note);

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        closeModal();
        loadData(); // ទាញយកទិន្នន័យថ្មីក្រោយពេល Update 
    } catch (e) {
        alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ');
    }
    btn.innerText = "រក្សាទុក";
}