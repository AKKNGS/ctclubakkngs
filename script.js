const SCRIPT_URL = 'សូមដាក់_WEB_APP_URL_របស់អ្នកនៅទីនេះ'; 
let isAdmin = false; // បិទសិទ្ធិ Admin ជា Default
let studentData = [];

// ទាញយកទិន្នន័យពេលបើក App ភ្លាម
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('student-list').innerHTML = '';
    try {
        const response = await fetch(SCRIPT_URL);
        studentData = await response.json();
        renderData();
    } catch (e) {
        document.getElementById('loading').innerHTML = '<span class="material-symbols-outlined">error</span> មានបញ្ហាក្នុងការទាញទិន្នន័យ';
    }
}

function renderData() {
    const list = document.getElementById('student-list');
    list.innerHTML = '';
    document.getElementById('loading').style.display = 'none';

    studentData.forEach(row => {
        // កាត់ចោលជួរ (Rows) ណាដែលគ្មានឈ្មោះ ដើម្បីកុំឱ្យលោតផ្ទាំងទទេដូចក្នុងរូបរបស់អ្នក
        if (!row['ឈ្មោះ'] || row['ឈ្មោះ'].trim() === "") return; 

        const card = document.createElement('div');
        card.className = 'student-card';
        
        let html = `
            <div class="student-info">
                <h3>${row['លរ']}. ${row['ឈ្មោះ']}</h3>
                <p>ថ្នាក់: <b>${row['ថ្នាក់']}</b> | ភេទ: <b>${row['ភេទ']}</b></p>
                <p class="note">${row['កំណត់សម្គាល់']}</p>
            </div>
        `;

        // បង្ហាញប៊ូតុងកែប្រែ លុះត្រាតែបាន Login រួច
        if (isAdmin) {
            html += `
                <button class="edit-action-btn" onclick="openEditModal('${row['លរ']}', '${row['ឈ្មោះ']}', '${row['ភេទ']}', '${row['ថ្នាក់']}', '${row['កំណត់សម្គាល់']}')">
                    <span class="material-symbols-outlined" style="font-size: 18px;">edit</span> កែប្រែ
                </button>
            `;
        }

        card.innerHTML = html;
        list.appendChild(card);
    });
}

// ------ មុខងារគ្រប់គ្រងគណនី (Login) ------
function toggleLoginModal() {
    if (isAdmin) {
        // បើមានសិទ្ធិហើយ ចុចប៊ូតុងម្តងទៀតគឺ Logout
        isAdmin = false;
        document.getElementById('auth-icon').innerText = 'login';
        renderData(); // Render ថ្មីដើម្បីលាក់ប៊ូតុងកែប្រែ
    } else {
        document.getElementById('login-modal').style.display = 'flex';
    }
}

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    if (user === 'admin' && pass === '1234') {
        isAdmin = true;
        document.getElementById('auth-icon').innerText = 'logout'; // ប្តូរ Icon ទៅ Logout
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('login-error').innerText = '';
        renderData(); // Render ថ្មីដើម្បីបង្ហាញប៊ូតុងកែប្រែ
    } else {
        document.getElementById('login-error').innerText = "ឈ្មោះ ឬ លេខសម្ងាត់ខុស!";
    }
}

// ------ មុខងារកែប្រែ (Edit) ------
function openEditModal(id, name, gender, className, note) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-gender').value = gender;
    document.getElementById('edit-class').value = className;
    document.getElementById('edit-note').value = note;
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

async function saveData() {
    const btn = document.querySelector('.save-btn');
    btn.innerText = "កំពុងរក្សាទុក...";
    
    const formData = new URLSearchParams();
    formData.append('action', 'update');
    formData.append('id', document.getElementById('edit-id').value);
    formData.append('name', document.getElementById('edit-name').value);
    formData.append('gender', document.getElementById('edit-gender').value);
    formData.append('className', document.getElementById('edit-class').value);
    formData.append('note', document.getElementById('edit-note').value);

    try {
        await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        closeEditModal();
        loadData(); // ទាញទិន្នន័យថ្មី
    } catch (e) {
        alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ');
    }
    btn.innerText = "រក្សាទុក";
}
